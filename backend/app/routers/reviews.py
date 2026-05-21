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