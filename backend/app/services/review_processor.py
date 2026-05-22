import logging
from sqlalchemy.orm import Session
from app.models.review import Review
from app.services.ai_service import analyze_review, generate_reply

logger = logging.getLogger(__name__)

def process_review(review: Review, db: Session, business_name: str = "Our Business"):
    # Step 1 - Analyze
    logger.info("Analyzing review %s...", review.id)
    analysis = analyze_review(review.review_text or "", review.rating)

    # Step 2 - Store analysis
    review.sentiment = analysis.get("sentiment")
    review.risk_level = analysis.get("risk_level")
    review.risk_reason = analysis.get("risk_reason")

    # Step 3 - Handle by risk level
    if review.risk_level == "high":
        review.status = "flagged"
        logger.info("Review %s flagged as HIGH RISK", review.id)
        _notify_flagged(review)

    elif review.risk_level == "medium":
        reply = generate_reply(review.review_text or "", review.rating, business_name)
        review.generated_reply = reply
        review.status = "pending"
        logger.info("Review %s needs approval", review.id)
        _notify_approval_needed(review)

    else:
        reply = generate_reply(review.review_text or "", review.rating, business_name)
        review.generated_reply = reply
        review.status = "approved"
        logger.info("Review %s approved for auto-reply", review.id)

    db.commit()
    db.refresh(review)
    return review

def _notify_flagged(review: Review):
    try:
        from app.services.email_service import send_flagged_review_alert
        from app.database import SessionLocal
        db = SessionLocal()
        tenant = db.query(__import__('app.models.tenant', fromlist=['Tenant']).Tenant).filter_by(id=review.tenant_id).first()
        if tenant and tenant.email:
            send_flagged_review_alert(
                tenant.email,
                review.reviewer_name or "Anonymous",
                review.rating,
                review.review_text or "",
            )
        db.close()
    except Exception as e:
        logger.exception("Failed to send flagged alert: %s", e)

def _notify_approval_needed(review: Review):
    try:
        from app.services.email_service import send_approval_needed
        from app.database import SessionLocal
        db = SessionLocal()
        tenant = db.query(__import__('app.models.tenant', fromlist=['Tenant']).Tenant).filter_by(id=review.tenant_id).first()
        if tenant and tenant.email:
            send_approval_needed(
                tenant.email,
                review.reviewer_name or "Anonymous",
                review.rating,
                review.review_text or "",
                review.generated_reply or "",
            )
        db.close()
    except Exception as e:
        logger.exception("Failed to send approval needed email: %s", e)
