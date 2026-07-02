import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import SessionLocal
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.google_service import refresh_access_token, post_reply

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

# Reviews stuck in "scheduled" longer than this are reverted to "pending" for manual action
_STALE_THRESHOLD = timedelta(hours=72)


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
            # Safety net: if a review has been stuck in "scheduled" for 72+ hours without
            # posting successfully, revert to "pending" so a human can handle it.
            if review.reply_at:
                reply_at_utc = review.reply_at.replace(tzinfo=timezone.utc)
                if reply_at_utc < stale_cutoff:
                    logger.error(
                        "Review %s has been stuck in 'scheduled' for 72+ hours — "
                        "reverting to pending for manual review (tenant %s)",
                        review.id,
                        review.tenant_id,
                    )
                    review.status = "pending"
                    review.reply_at = None
                    db.commit()
                    continue

            try:
                tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
                if not tenant or not tenant.google_access_token:
                    logger.warning(
                        "No Google token for tenant %s — skipping review %s",
                        review.tenant_id, review.id,
                    )
                    continue
                if not tenant.google_account_id or not tenant.google_location_id:
                    logger.warning(
                        "No location set for tenant %s — skipping review %s",
                        review.tenant_id, review.id,
                    )
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
                    "Failed to auto-post reply for review %s (tenant %s) — "
                    "will retry on next scheduler run",
                    review.id, review.tenant_id,
                )
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(fire_scheduled_replies, "interval", minutes=5, id="fire_scheduled_replies")
    scheduler.start()
    logger.info("Reply scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Reply scheduler stopped")
