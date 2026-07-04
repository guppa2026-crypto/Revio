from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.dependencies import get_current_user
from app.utils.limiter import limiter
from app.services.review_processor import process_review
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def require_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tenant:
    """Block access if tenant has no active subscription."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.is_subscribed:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required. Please upgrade at /billing.",
        )
    return tenant


@router.get("/")
def get_reviews(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    query = db.query(Review).filter(Review.tenant_id == current_user.tenant_id)
    if status:
        query = query.filter(Review.status == status)
    if risk_level:
        query = query.filter(Review.risk_level == risk_level)
    return query.order_by(Review.created_at.desc()).all()


@router.get("/{review_id}")
def get_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.post("/{review_id}/approve")
def approve_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.status != "pending":
        raise HTTPException(status_code=400, detail="Review is not pending approval")
    review.status = "approved"
    db.commit()
    db.refresh(review)
    return {"message": "Reply approved", "review_id": str(review.id)}


@router.post("/{review_id}/reject")
def reject_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "rejected"
    db.commit()
    db.refresh(review)
    return {"message": "Reply rejected", "review_id": str(review.id)}


@router.post("/{review_id}/regenerate")
@limiter.limit("5/minute")
def regenerate_reply(
    request: Request,
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    from app.services.ai_service import generate_reply
    risk_level = review.risk_level or "low"
    new_reply = generate_reply(review.review_text or "", review.rating, tenant.name, risk_level=risk_level)
    review.generated_reply = new_reply
    db.commit()
    db.refresh(review)
    return {"generated_reply": new_reply}


@router.post("/{review_id}/cancel-schedule")
def cancel_schedule(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.status != "scheduled":
        raise HTTPException(status_code=400, detail="Review is not scheduled")
    review.status = "pending"
    review.reply_at = None
    db.commit()
    db.refresh(review)
    return {"message": "Auto-reply cancelled", "review_id": str(review.id)}


class ManualReviewInput(BaseModel):
    reviewer_name: str = Field(..., min_length=1, max_length=100)
    rating: int = Field(..., ge=1, le=5)
    review_text: str = Field(..., min_length=1, max_length=5000)

    @field_validator("reviewer_name", "review_text", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


def _process_review_background(review_id: str, tenant_name: str, tone_instructions: str) -> None:
    from uuid import UUID as PyUUID
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == PyUUID(review_id)).first()
        if review:
            process_review(review, db, tenant_name, tone_instructions=tone_instructions)
    except Exception:
        logger.exception("Background review processing failed for %s", review_id)
    finally:
        db.close()


@router.post("/import")
def import_review(
    data: ManualReviewInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    review = Review(
        tenant_id=current_user.tenant_id,
        google_review_id=f"manual_{uuid.uuid4()}",
        reviewer_name=data.reviewer_name,
        rating=data.rating,
        review_text=data.review_text,
        review_date=datetime.now(timezone.utc),
        status="processing",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    background_tasks.add_task(
        _process_review_background,
        str(review.id),
        tenant.name,
        tenant.tone_instructions or "",
    )
    return review
