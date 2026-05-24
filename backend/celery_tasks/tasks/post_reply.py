import logging
from datetime import datetime, timedelta, timezone
from celery import shared_task
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Tenant, Review

logger = logging.getLogger(__name__)

STUCK_THRESHOLD_MINUTES = 30

def _post_reply_to_google(review):
    # TODO: replace with real Google My Business API call
    logger.info("[STUB] Would post reply for review %s: %r", review.id, review.generated_reply)
    return True

@shared_task(bind=True, name="celery_tasks.tasks.post_reply.schedule_auto_reply",
             max_retries=5, default_retry_delay=120)
def schedule_auto_reply(self, review_id):
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            return {"error": "review_not_found"}
        if review.status != "approved":
            return {"skipped": True, "status": review.status}
        if not review.generated_reply:
            return {"skipped": True, "reason": "no_reply_text"}
        success = _post_reply_to_google(review)
        if success:
            review.status = "posted"
            review.posted_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Reply posted for review %s", review_id)
            return {"review_id": review_id, "status": "posted"}
        else:
            raise RuntimeError(f"Google API failed for review {review_id}")
    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()

@shared_task(bind=True, name="celery_tasks.tasks.post_reply.retry_stuck_replies",
             max_retries=1)
def retry_stuck_replies(self):
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STUCK_THRESHOLD_MINUTES)
        stuck = db.query(Review).filter(
            Review.status == "approved",
            Review.updated_at <= cutoff,
        ).all()
        for review in stuck:
            schedule_auto_reply.delay(review.id)
            logger.info("Re-queued stuck review %s", review.id)
        return {"requeued": len(stuck)}
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        db.close()
