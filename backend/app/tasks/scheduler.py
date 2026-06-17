import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import SessionLocal
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.google_service import refresh_access_token, post_reply

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def fire_scheduled_replies():
    """Post any scheduled replies whose reply_at time has passed."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due = db.query(Review).filter(
            Review.status == "scheduled",
            Review.reply_at <= now,
        ).all()

        for review in due:
            try:
                tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
                if not tenant or not tenant.google_access_token:
                    logger.warning("No Google token for tenant %s, skipping review %s", review.tenant_id, review.id)
                    continue
                if not tenant.google_account_id or not tenant.google_location_id:
                    logger.warning("No location set for tenant %s, skipping review %s", review.tenant_id, review.id)
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
                logger.exception("Failed to auto-post reply for review %s", review.id)
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
