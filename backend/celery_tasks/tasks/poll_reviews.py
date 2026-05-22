import logging
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Tenant
from app.models.review import Review
from app.services.review_processor import process_review

logger = logging.getLogger(__name__)

def fetch_reviews_for_tenant(tenant):
    # TODO: replace with real Google My Business API call
    return []

def _poll_tenant(tenant, db):
    raw_reviews = fetch_reviews_for_tenant(tenant)
    ingested = 0
    for raw in raw_reviews:
        external_id = str(raw["external_id"])
        existing = db.query(Review).filter(
            Review.tenant_id == tenant.id,
            Review.external_id == external_id
        ).first()
        if existing:
            continue
        published_at = raw.get("published_at")
        if isinstance(published_at, str):
            published_at = datetime.fromisoformat(published_at)
        review = Review(
            tenant_id=tenant.id,
            external_id=external_id,
            author_name=raw["author_name"],
            rating=int(raw["rating"]),
            text=raw["text"],
            published_at=published_at or datetime.now(timezone.utc),
            status="pending",
        )
        db.add(review)
        db.flush()
        try:
            process_review(review, db)
            db.commit()
            db.refresh(review)
            if review.risk_level == "low" and review.status == "approved":
                from celery_tasks.tasks.post_reply import schedule_auto_reply
                schedule_auto_reply.apply_async(args=[review.id], countdown=300)
            ingested += 1
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to process review %s: %s", external_id, exc)
    return ingested

@shared_task(bind=True, name="celery_tasks.tasks.poll_reviews.poll_all_tenants",
             max_retries=3, default_retry_delay=60)
def poll_all_tenants(self):
    db = SessionLocal()
    total = 0
    try:
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
        logger.info("Polling %d tenants", len(tenants))
        for tenant in tenants:
            try:
                count = _poll_tenant(tenant, db)
                total += count
            except Exception as exc:
                logger.exception("Error polling tenant %s: %s", tenant.id, exc)
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        db.close()
    return {"reviews_ingested": total}

@shared_task(bind=True, name="celery_tasks.tasks.poll_reviews.poll_single_tenant",
             max_retries=3, default_retry_delay=30)
def poll_single_tenant(self, tenant_id):
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return {"error": "tenant_not_found"}
        count = _poll_tenant(tenant, db)
        return {"tenant_id": tenant_id, "reviews_ingested": count}
    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()
