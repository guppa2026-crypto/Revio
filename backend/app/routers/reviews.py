from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.dependencies import get_current_user
from app.services.review_processor import process_review
from datetime import datetime
import uuid

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def require_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Tenant:
    """Blocks access if tenant is not subscribed."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.is_subscribed:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required. Please upgrade at /billing."
        )
    return tenant


@router.get("/")
def get_reviews(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    query = db.query(Review).filter(Review.tenant_id == current_user.tenant_id)
    if status:
        query = query.filter(Review.status == status)
    if risk_level:
        query = query.filter(Review.risk_level == risk_level)
    reviews = query.order_by(Review.created_at.desc()).all()
    return reviews


@router.get("/{review_id}")
def get_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.post("/{review_id}/approve")
def approve_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
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
    tenant: Tenant = Depends(require_subscription)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "rejected"
    db.commit()
    db.refresh(review)
    return {"message": "Reply rejected", "review_id": str(review.id)}


@router.post("/{review_id}/regenerate")
def regenerate_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    from app.services.ai_service import generate_reply
    risk_level = review.risk_level or "low"
    new_reply = generate_reply(review.review_text or "", review.rating, tenant.name, risk_level=risk_level, tone_guidance=tenant.tone_guidance or "")
    review.generated_reply = new_reply
    db.commit()
    db.refresh(review)
    return {"generated_reply": new_reply}


@router.post("/{review_id}/cancel-schedule")
def cancel_schedule(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
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
    reviewer_name: str
    rating: int
    review_text: str

@router.post("/import")
def import_review(
    data: ManualReviewInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    review = Review(
        tenant_id=current_user.tenant_id,
        google_review_id=f"manual_{uuid.uuid4()}",
        reviewer_name=data.reviewer_name,
        rating=data.rating,
        review_text=data.review_text,
        review_date=datetime.utcnow()
    )
    db.add(review)
    db.flush()
    processed = process_review(review, db, tenant.name, tone_guidance=tenant.tone_guidance or "")
    return processed

@router.post("/test-process")
def test_process_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription)
):
    fake_review = Review(
        tenant_id=current_user.tenant_id,
        google_review_id=str(uuid.uuid4()),
        reviewer_name="Test Customer",
        rating=2,
        review_text="The service was terrible and the food was cold. I want a refund.",
        review_date=datetime.utcnow()
    )
    db.add(fake_review)
    db.flush()
    processed = process_review(fake_review, db, tenant.name, tone_guidance=tenant.tone_guidance or "")
    return {
        "review_id": str(processed.id),
        "sentiment": processed.sentiment,
        "risk_level": processed.risk_level,
        "risk_reason": processed.risk_reason,
        "status": processed.status,
        "generated_reply": processed.generated_reply
    }