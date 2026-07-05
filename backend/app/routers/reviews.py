from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
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
from app.config import settings
from datetime import datetime, timezone, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


TRIAL_DAYS = 7


def _in_trial(tenant: Tenant) -> bool:
    created = tenant.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) < created + timedelta(days=TRIAL_DAYS)


def require_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tenant:
    """Allow access during the 7-day free trial or with an active subscription."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.is_subscribed and not _in_trial(tenant):
        raise HTTPException(
            status_code=403,
            detail="Your free trial has ended. Please subscribe at /billing.",
        )
    return tenant


def _approval_html(heading: str, body: str, color: str = "#16A34A") -> str:
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{heading} — Revio</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#F5F4F1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
<div style="background:#fff;border:1px solid #E8E6E0;border-radius:20px;padding:40px 36px;max-width:440px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <div style="width:48px;height:48px;border-radius:50%;background:{color}22;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;">{'✓' if color == '#16A34A' else '!'}</div>
  <h1 style="font-size:20px;font-weight:700;color:#1A1916;margin:0 0 10px;">{heading}</h1>
  <p style="font-size:14px;color:#6B6963;margin:0 0 28px;line-height:1.6;">{body}</p>
  <a href="{settings.FRONTEND_URL}/dashboard" style="display:inline-block;background:#1A1916;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Go to Dashboard →</a>
</div>
</body></html>"""


@router.get("/approve-via-email", response_class=HTMLResponse, include_in_schema=False)
def approve_via_email(token: str, db: Session = Depends(get_db)):
    """One-click approval from a signed email link — no login required."""
    from app.utils.approval_token import verify_approval_token
    review_id = verify_approval_token(token)
    if not review_id:
        return HTMLResponse(
            _approval_html(
                "Link expired or invalid",
                "This approval link has expired or is no longer valid. Please log in to your dashboard to approve the reply manually.",
                color="#B91C1C",
            ),
            status_code=400,
        )
    try:
        review = db.query(Review).filter(Review.id == UUID(review_id)).first()
    except Exception:
        review = None

    if not review:
        return HTMLResponse(
            _approval_html("Review not found", "We couldn't find this review.", color="#B91C1C"),
            status_code=404,
        )
    if review.status != "pending":
        return HTMLResponse(
            _approval_html(
                "Already actioned",
                f"This reply has already been {review.status}. No further action needed.",
                color="#D97706",
            )
        )

    review.status = "approved"
    db.commit()
    return HTMLResponse(
        _approval_html(
            "Reply approved",
            "The AI-generated reply has been approved and will be posted to your Google Business Profile shortly.",
        )
    )


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
    from app.utils.plan_limits import at_reply_limit
    if at_reply_limit(tenant, db):
        raise HTTPException(status_code=429, detail="AI reply limit reached for your current plan.")
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
    from app.utils.plan_limits import at_reply_limit
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == PyUUID(review_id)).first()
        if review:
            tenant = db.query(Tenant).filter(Tenant.id == review.tenant_id).first()
            if tenant and at_reply_limit(tenant, db):
                review.status = "pending"
                db.commit()
                logger.info("Review %s skipped AI — tenant %s at reply limit", review_id, review.tenant_id)
                return
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
