import logging
import re
from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.orm import Session
from app import database
from app.models.review import Review
from app.models.tenant import Tenant
from app.services.ai_service import analyze_review, generate_reply
from app.config import settings

logger = logging.getLogger(__name__)


def run_review_processing(review_id: str) -> None:
    """Analyse a review and draft a reply in its own DB session (for background threads).

    Respects the tenant's plan reply limit. If anything fails, the review is moved from
    'processing' to 'pending' (without a draft) so the owner can still act on it.
    """
    from app.utils.plan_limits import at_reply_limit
    db = database.SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == UUID(review_id)).first()
        if not review:
            return
        tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
        if not tenant:
            return
        if at_reply_limit(tenant, db):
            review.status = "pending"
            db.commit()
            logger.info("Review %s skipped AI — tenant %s at reply limit", review_id, tenant.id)
            return
        process_review(review, db, tenant.name, tone_instructions=tenant.tone_instructions or "")
    except Exception:
        logger.exception("Review processing failed for %s — moving to pending without a draft", review_id)
        db.rollback()
        release_processing(db, Review.id == UUID(review_id))
    finally:
        db.close()


def release_processing(db: Session, *criteria) -> int:
    """Move matching reviews still in 'processing' to 'pending'. Returns the number moved."""
    try:
        moved = db.query(Review).filter(Review.status == "processing", *criteria).update(
            {"status": "pending"}, synchronize_session=False,
        )
        db.commit()
        return moved
    except Exception:
        logger.exception("Could not release reviews stuck in 'processing'")
        db.rollback()
        return 0


# Auto-posted replies go out publicly without a human reading them, and the review text is
# written by anyone on the internet. These checks hold suspicious cases for approval,
# independently of what the model decided.
_MAX_AUTO_REPLY_CHARS = 1500
_URL = re.compile(r"https?://|www\.|\b[a-z0-9-]+\.(com|co\.uk|uk|net|org|io|ly|me)\b", re.IGNORECASE)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
_PHONE = re.compile(r"\+?\d[\d\s().-]{8,}\d")
_INJECTION = re.compile(
    r"ignore (all |any |the |your )?(previous|prior|above|earlier)"
    r"|disregard (all |any |the |your )?(previous|prior|above|instructions)"
    r"|system prompt|risk[_ ]level|you are (now )?(an? )?(ai|assistant|language model|chatbot)"
    r"|(reply|respond|answer) (only )?with\b|(say|write) exactly|new instructions",
    re.IGNORECASE,
)
_AI_SELF_REFERENCE = re.compile(r"\bas an ai\b|language model|i('m| am) an? (ai|assistant)", re.IGNORECASE)


def auto_post_hold_reason(review_text: str, reply: str) -> str | None:
    """Return why a reply must not be auto-posted, or None if it's safe to schedule."""
    if not reply or not reply.strip():
        return "the AI returned an empty reply"
    if len(reply) > _MAX_AUTO_REPLY_CHARS:
        return "the reply is unusually long"
    if _INJECTION.search(review_text):
        return "the review appears to contain instructions aimed at the AI"
    if _URL.search(reply) or _EMAIL.search(reply) or _PHONE.search(reply):
        return "the reply contains a link or contact details"
    if _AI_SELF_REFERENCE.search(reply):
        return "the reply refers to itself as an AI"
    return None


def process_review(review: Review, db: Session, business_name: str = "Our Business", tone_instructions: str = "") -> Review:
    logger.info("Analyzing review %s...", review.id)
    analysis = analyze_review(review.review_text or "", review.rating)

    review.sentiment = analysis.get("sentiment")
    review.risk_level = analysis.get("risk_level")
    review.risk_reason = analysis.get("risk_reason")

    if review.risk_level == "high":
        reply = generate_reply(review.review_text or "", review.rating, business_name, risk_level="high", tone_instructions=tone_instructions)
        review.generated_reply = reply
        review.status = "flagged"
        logger.info("Review %s flagged as HIGH RISK — draft generated", review.id)
        _notify_flagged(review, db)

    elif review.risk_level == "medium":
        reply = generate_reply(review.review_text or "", review.rating, business_name, tone_instructions=tone_instructions)
        review.generated_reply = reply
        review.status = "pending"
        logger.info("Review %s needs approval", review.id)
        _notify_approval_needed(review, db)

    else:
        reply = generate_reply(review.review_text or "", review.rating, business_name, tone_instructions=tone_instructions)
        review.generated_reply = reply
        hold_reason = auto_post_hold_reason(review.review_text or "", reply)
        if review.rating >= 4 and hold_reason:
            review.status = "pending"
            review.risk_reason = f"Held for your approval: {hold_reason}"
            logger.warning("Review %s held from auto-post: %s", review.id, hold_reason)
            _notify_approval_needed(review, db)
        elif review.rating >= 4:
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
        from app.utils.approval_token import generate_approval_token
        tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
        if tenant and tenant.email:
            token = generate_approval_token(str(review.id))
            approval_url = f"{settings.BACKEND_URL}/reviews/approve-via-email?token={token}"
            send_approval_needed(
                tenant.email,
                review.reviewer_name or "Anonymous",
                review.rating,
                review.review_text or "",
                review.generated_reply or "",
                approval_url=approval_url,
            )
    except Exception:
        logger.exception("Failed to send approval needed email for review %s", review.id)
