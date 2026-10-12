import logging
import zlib
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.google_service import refresh_access_token, post_reply, get_reviews as google_get_reviews
from app.services.review_processor import run_review_processing, release_processing

logger = logging.getLogger(__name__)

# Jobs are plain functions run on the scheduler's worker threads, so their blocking DB and
# HTTP calls never stall the API's event loop
scheduler = BackgroundScheduler(timezone="UTC")
# AI analysis for newly polled reviews runs here so one slow tenant doesn't delay the rest
_processing_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="review-ai")

_STALE_THRESHOLD = timedelta(hours=72)
# AI processing normally takes seconds; anything older was lost (crash/restart)
_STUCK_PROCESSING_THRESHOLD = timedelta(minutes=30)
# A review left in 'approved' this long was claimed for posting but the outcome was never
# recorded (e.g. the process restarted mid-post) — hand it back to the owner
_STUCK_APPROVED_THRESHOLD = timedelta(minutes=30)

_STAR_RATING_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


@contextmanager
def _job_lock(job_id: str):
    """Yield True if this process may run the job.

    Uses a Postgres advisory lock so that, if more than one instance of the app is
    running, only one runs each job at a time. Other databases (tests) always run.
    """
    if engine.dialect.name != "postgresql":
        yield True
        return
    key = zlib.crc32(job_id.encode())
    conn = engine.connect()
    acquired = False
    try:
        acquired = bool(conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
        if not acquired:
            logger.info("Job %s already running in another instance — skipping", job_id)
        yield acquired
    finally:
        if acquired:
            conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
        conn.close()


# ---------------------------------------------------------------------------
# Job 1: fire scheduled replies (every 5 min)
# ---------------------------------------------------------------------------

def _release_stuck_approved(db, now: datetime) -> None:
    """Return Google reviews stuck in 'approved' to the owner's queue."""
    released = db.query(Review).filter(
        Review.status == "approved",
        Review.updated_at <= now - _STUCK_APPROVED_THRESHOLD,
        ~Review.google_review_id.startswith("manual_", autoescape=True),  # 'approved' is final for manual imports
    ).update({"status": "pending", "updated_at": now}, synchronize_session=False)
    db.commit()
    if released:
        logger.error("Released %d review(s) stuck in 'approved' back to pending", released)


def fire_scheduled_replies():
    with _job_lock("fire_scheduled_replies") as acquired:
        if acquired:
            _fire_scheduled_replies()


def _fire_scheduled_replies():
    """Post any scheduled replies whose reply_at time has passed."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        stale_cutoff = now - _STALE_THRESHOLD
        _release_stuck_approved(db, now)
        stuck = release_processing(db, Review.created_at <= now - _STUCK_PROCESSING_THRESHOLD)
        if stuck:
            logger.error("Released %d review(s) stuck in 'processing' back to pending", stuck)

        due = db.query(Review).filter(
            Review.status == "scheduled",
            Review.reply_at <= now,
        ).all()

        for review in due:
            if review.reply_at:
                reply_at_utc = review.reply_at.replace(tzinfo=timezone.utc)
                if reply_at_utc < stale_cutoff:
                    logger.error(
                        "Review %s stuck in 'scheduled' 72+ h — reverting to pending (tenant %s)",
                        review.id, review.tenant_id,
                    )
                    db.query(Review).filter(
                        Review.id == review.id,
                        Review.status == "scheduled",
                    ).update({"status": "pending", "reply_at": None}, synchronize_session=False)
                    db.commit()
                    continue

            try:
                tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
                if not tenant or not tenant.google_access_token:
                    logger.warning("No Google token for tenant %s — skipping %s", review.tenant_id, review.id)
                    continue
                if not tenant.google_account_id or not tenant.google_location_id:
                    logger.warning("No location for tenant %s — skipping %s", review.tenant_id, review.id)
                    continue
            except Exception:
                logger.exception("Failed to load tenant for review %s", review.id)
                continue

            # Claim the review before posting. If the owner cancelled, edited-and-posted, or
            # another instance claimed it since we loaded it, the update matches no row.
            claimed = db.query(Review).filter(
                Review.id == review.id,
                Review.status == "scheduled",
            ).update(
                {"status": "approved", "updated_at": datetime.now(timezone.utc)},
                synchronize_session=False,
            )
            db.commit()
            if not claimed:
                logger.info("Review %s no longer scheduled — not auto-posting", review.id)
                continue
            db.refresh(review)

            try:
                token = refresh_access_token(tenant, db)
                post_reply(
                    token,
                    tenant.google_account_id,
                    tenant.google_location_id,
                    review.google_review_id,
                    review.generated_reply,
                )
            except Exception:
                logger.exception(
                    "Failed to auto-post reply for review %s (tenant %s) — will retry",
                    review.id, review.tenant_id,
                )
                db.rollback()
                db.query(Review).filter(
                    Review.id == review.id,
                    Review.status == "approved",
                ).update({"status": "scheduled"}, synchronize_session=False)
                db.commit()
                continue

            review.status = "posted"
            review.posted_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Auto-posted reply for review %s (tenant %s)", review.id, tenant.id)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 2: poll Google for new reviews (every 20 min)
# ---------------------------------------------------------------------------

def poll_google_reviews():
    with _job_lock("poll_google_reviews") as acquired:
        if acquired:
            _poll_google_reviews()


def _poll_google_reviews():
    """Fetch new Google reviews for every connected, subscribed tenant."""
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).filter(
            Tenant.is_subscribed.is_(True),
            Tenant.google_access_token.isnot(None),
            Tenant.google_account_id.isnot(None),
            Tenant.google_location_id.isnot(None),
        ).all()

        for tenant in tenants:
            try:
                _poll_tenant(tenant, db)
            except Exception:
                logger.exception("Failed to poll reviews for tenant %s", tenant.id)
    finally:
        db.close()


def _poll_tenant(tenant: Tenant, db) -> None:
    token = refresh_access_token(tenant, db)
    known_ids = {
        gid for (gid,) in db.query(Review.google_review_id).filter(Review.tenant_id == tenant.id)
    }
    raw_reviews = google_get_reviews(
        token, tenant.google_account_id, tenant.google_location_id, known_ids=known_ids,
    )

    new_review_ids: list[str] = []

    for rd in raw_reviews:
        google_review_id = rd.get("reviewId")
        if not google_review_id:
            continue

        if google_review_id in known_ids:
            continue
        known_ids.add(google_review_id)  # guard against duplicates across pages

        rating = _STAR_RATING_MAP.get(rd.get("starRating", ""), 3)
        reviewer = rd.get("reviewer", {})
        reviewer_name = (
            reviewer.get("displayName") if not reviewer.get("isAnonymous") else "Anonymous"
        ) or "Anonymous"
        comment = rd.get("comment") or ""
        create_time = rd.get("createTime", "")
        try:
            review_date = datetime.fromisoformat(create_time.replace("Z", "+00:00"))
        except Exception:
            review_date = datetime.now(timezone.utc)

        already_replied = bool(rd.get("reviewReply"))

        review = Review(
            tenant_id=tenant.id,
            google_review_id=google_review_id,
            reviewer_name=reviewer_name,
            rating=rating,
            review_text=comment,
            review_date=review_date,
            status="posted" if already_replied else "processing",
        )
        db.add(review)
        db.flush()

        if not already_replied:
            new_review_ids.append(str(review.id))

    db.commit()

    if new_review_ids:
        for review_id in new_review_ids:
            _processing_pool.submit(run_review_processing, review_id)
        logger.info("Polled %d new reviews for tenant %s", len(new_review_ids), tenant.id)


# ---------------------------------------------------------------------------
# Job 3: weekly digest email (Monday 08:00 UTC)
# ---------------------------------------------------------------------------

def send_weekly_digests():
    with _job_lock("send_weekly_digests") as acquired:
        if acquired:
            _send_weekly_digests()


def _send_weekly_digests():
    """Send a weekly summary email to every subscribed tenant."""
    from app.services.email_service import send_weekly_digest_email
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        tenants = db.query(Tenant).filter(Tenant.is_subscribed.is_(True)).all()
        sent = 0

        for tenant in tenants:
            try:
                week_reviews = db.query(Review).filter(
                    Review.tenant_id == tenant.id,
                    Review.created_at >= week_ago,
                    Review.status != "processing",
                ).all()

                pending_count = db.query(Review).filter(
                    Review.tenant_id == tenant.id,
                    Review.status.in_(["pending", "flagged"]),
                ).count()

                all_reviews = db.query(Review).filter(
                    Review.tenant_id == tenant.id,
                    Review.status != "processing",
                ).all()

                total = len(all_reviews)
                avg_rating = round(sum(r.rating for r in all_reviews) / total, 1) if total else 0.0

                send_weekly_digest_email(
                    tenant.email,
                    tenant.name,
                    new_count=len(week_reviews),
                    avg_rating=avg_rating,
                    pending_count=pending_count,
                    total_count=total,
                )
                sent += 1
            except Exception:
                logger.exception("Failed to send weekly digest for tenant %s", tenant.id)

        logger.info("Weekly digest sent to %d tenants", sent)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

def start_scheduler():
    scheduler.add_job(fire_scheduled_replies, "interval", minutes=5, id="fire_scheduled_replies")
    scheduler.add_job(poll_google_reviews, "interval", minutes=20, id="poll_google_reviews")
    scheduler.add_job(
        send_weekly_digests, "cron",
        day_of_week="mon", hour=8, minute=0,
        id="send_weekly_digests",
    )
    scheduler.start()
    logger.info("Scheduler started (fire_replies/5m, poll_reviews/20m, digest/Mon 08:00)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
    _processing_pool.shutdown(wait=False)
