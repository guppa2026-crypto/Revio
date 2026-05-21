from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.get("/")
def get_reviews(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Review).filter(Review.tenant_id == current_user.tenant_id)

    if status:
        query = query.filter(Review.reply_status == status)
    if risk_level:
        query = query.filter(Review.risk_level == risk_level)

    reviews = query.order_by(Review.created_at.desc()).all()
    return reviews

@router.get("/{review_id}")
def get_review(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    return review

@router.post("/{review_id}/approve")
def approve_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    if review.reply_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review is not pending approval"
        )

    review.reply_status = "approved"
    review.final_reply = review.ai_reply
    db.commit()
    db.refresh(review)
    return {"message": "Reply approved", "review": review}

@router.post("/{review_id}/reject")
def reject_reply(
    review_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.tenant_id == current_user.tenant_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    review.reply_status = "rejected"
    db.commit()
    db.refresh(review)
    return {"message": "Reply rejected", "review": review}
from app.services.review_processor import process_review
from app.models.tenant import Tenant
from datetime import datetime
import uuid

@router.post("/test-process")
def test_process_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get the tenant
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    # Create a fake review
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

    # Process it through the AI pipeline
    processed = process_review(fake_review, db, tenant.name)

    return {
        "review_id": str(processed.id),
        "sentiment": processed.sentiment,
        "risk_level": processed.risk_level,
        "summary": processed.ai_summary,
        "reply_status": processed.reply_status,
        "requires_approval": processed.requires_approval,
        "ai_reply": processed.ai_reply
    }