import asyncio
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import SessionLocal
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.google_service import refresh_access_token, post_reply, get_reviews as google_get_reviews

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

_STALE_THRESHOLD = timedelta(hours=72)

_STAR_RATING_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


# ---------------------------------------------------------------------------
# Job 1: fire scheduled replies (every 5 min)
# ---------------------------------------------------------------------------

async def fire_scheduled_replies():
    """Post any scheduled replies whose reply_at time has passed."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        stale_cutoff = now - _STALE_THRESHOLD

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
                    review.status = "pending"
                    review.reply_at = None
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

                token = await refresh_access_token(tenant, db)
                await post_reply(
                    token,
                    tenant.google_account_id,
                    tenant.google_location_id,
                    review.google_review_id,
                    review.generated_reply,
                )
                review.status = "posted"
                review.posted_at = datetime.now(timezone.utc)
                db.commit()
                logger.info("Auto-posted reply for review %s (tenant %s)", review.id, tenant.id)

            except Exception:
                logger.exception(
                    "Failed to auto-post reply for review %s (tenant %s) — will retry",
                    review.id, review.tenant_id,
                )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 2: poll Google for new reviews (every 20 min)
# ---------------------------------------------------------------------------

def _run_process_review(review_id: str, tenant_name: str, tone_instructions: str) -> None:
    """Sync wrapper that opens its own DB session — runs in a thread pool."""
    from uuid import UUID as PyUUID
    from app.services.review_processor import process_review
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == PyUUID(review_id)).first()
        if review:
            process_review(review, db, tenant_name, tone_instructions=tone_instructions)
    except Exception:
        logger.exception("Background processing failed for review %s", review_id)
    finally:
        db.close()


async def poll_google_reviews():
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
                await _poll_tenant(tenant, db)
            except Exception:
                logger.exception("Failed to poll reviews for tenant %s", tenant.id)
    finally:
        db.close()


async def _poll_tenant(tenant: Tenant, db) -> None:
    token = await refresh_access_token(tenant, db)
    raw_reviews = await google_get_reviews(token, tenant.google_account_id, tenant.google_location_id)

    new_infos: list[tuple[str, str, str]] = []  # (review_id, tenant_name, tone)

    for rd in raw_reviews:
        google_review_id = rd.get("reviewId")
        if not google_review_id:
            continue

        if db.query(Review).filter(Review.google_review_id == google_review_id).first():
            continue

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
            new_infos.append((str(review.id), tenant.name, tenant.tone_instructions or ""))

    db.commit()

    if new_infos:
        loop = asyncio.get_running_loop()
        for review_id, tenant_name, tone in new_infos:
            loop.run_in_executor(None, _run_process_review, review_id, tenant_name, tone)
        logger.info("Polled %d new reviews for tenant %s", len(new_infos), tenant.id)


# ---------------------------------------------------------------------------
# Job 3: weekly digest email (Monday 08:00 UTC)
# ---------------------------------------------------------------------------

async def send_weekly_digests():
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
