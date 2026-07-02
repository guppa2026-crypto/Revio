import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.ai_service import analyze_review, generate_reply

logger = logging.getLogger(__name__)


def process_review(review: Review, db: Session, business_name: str = "Our Business") -> Review:
    logger.info("Analyzing review %s...", review.id)
    analysis = analyze_review(review.review_text or "", review.rating)

    review.sentiment = analysis.get("sentiment")
    review.risk_level = analysis.get("risk_level")
    review.risk_reason = analysis.get("risk_reason")

    if review.risk_level == "high":
        reply = generate_reply(review.review_text or "", review.rating, business_name, risk_level="high")
        review.generated_reply = reply
        review.status = "flagged"
        logger.info("Review %s flagged as HIGH RISK — draft generated", review.id)
        _notify_flagged(review, db)

    elif review.risk_level == "medium":
        reply = generate_reply(review.review_text or "", review.rating, business_name)
        review.generated_reply = reply
        review.status = "pending"
        logger.info("Review %s needs approval", review.id)
        _notify_approval_needed(review, db)

    else:
        reply = generate_reply(review.review_text or "", review.rating, business_name)
        review.generated_reply = reply
        if review.rating >= 4:
            review.status = "scheduled"
            review.reply_at = datetime.now(timezone.utc) + timedelta(hours=24)
            logger.info("Review %s scheduled for auto-reply in 24h", review.id)
        else:
            review.status = "pending"
            logger.info("Review %s queued for manual approval", review.id)
            _notify_approval_needed(review, db)

    db.commit()
    db.refresh(review)
    return review


def _notify_flagged(review: Review, db: Session) -> None:
    try:
        from app.services.email_service import send_flagged_review_alert
        tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
        if tenant and tenant.email:
            send_flagged_review_alert(
                tenant.email,
                review.reviewer_name or "Anonymous",
                review.rating,
                review.review_text or "",
                review.generated_reply or "",
            )
    except Exception:
        logger.exception("Failed to send flagged alert for review %s", review.id)


def _notify_approval_needed(review: Review, db: Session) -> None:
    try:
        from app.services.email_service import send_approval_needed
        tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
        if tenant and tenant.email:
            send_approval_needed(
                tenant.email,
                review.reviewer_name or "Anonymous",
                review.rating,
                review.review_text or "",
                review.generated_reply or "",
            )
    except Exception:
        logger.exception("Failed to send approval needed email for review %s", review.id)
