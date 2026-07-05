from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, text
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.database import get_db, engine
from app.models.tenant import Tenant
from app.models.user import User
from app.models.review import Review
from app.utils.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not settings.admin_emails_list or current_user.email not in settings.admin_emails_list:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_tenants = db.query(Tenant).count()
    subscribed = db.query(Tenant).filter(Tenant.is_subscribed == True).count()
    starter_count = db.query(func.count(Tenant.id)).filter(
        Tenant.is_subscribed == True,
        Tenant.subscription_status == "active",
        Tenant.plan == "starter",
    ).scalar() or 0
    pro_count = db.query(func.count(Tenant.id)).filter(
        Tenant.is_subscribed == True,
        Tenant.subscription_status == "active",
        or_(Tenant.plan == "pro", Tenant.plan.is_(None)),
    ).scalar() or 0
    mrr = round(starter_count * 7.99 + pro_count * 14.99, 2)
    total_reviews = db.query(Review).count()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_this_week = db.query(Tenant).filter(Tenant.created_at >= week_ago).count()

    return {
        "total_customers": total_tenants,
        "subscribed": subscribed,
        "mrr": mrr,
        "total_reviews_processed": total_reviews,
        "new_signups_this_week": new_this_week,
    }


@router.get("/customers")
def get_customers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tenants = (
        db.query(Tenant)
        .order_by(Tenant.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    total = db.query(func.count(Tenant.id)).scalar()

    result = []
    for t in tenants:
        review_count = db.query(Review).filter(Review.tenant_id == t.id).count()
        result.append({
            "id": str(t.id),
            "name": t.name,
            "email": t.email,
            "is_subscribed": t.is_subscribed,
            "is_active": t.is_active,
            "review_count": review_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {"total": total, "skip": skip, "limit": limit, "customers": result}


@router.post("/fix-schema")
def fix_schema(secret: str = Query(...)):
    """One-shot: add missing columns that Alembic failed to apply. Protected by SECRET_KEY."""
    if secret != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")
    results = []
    with engine.connect() as conn:
        for col, ddl in [
            ("tone_instructions", "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tone_instructions TEXT"),
            ("plan", "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR"),
        ]:
            conn.execute(text(ddl))
            conn.commit()
            results.append(f"{col}: added (or already existed)")
    return {"fixed": results}


class GrantFreeRequest(BaseModel):
    email: str
    plan: str = "pro"


@router.post("/customers/grant-free")
def grant_free_access(
    body: GrantFreeRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tenant = db.query(Tenant).filter(Tenant.email == body.email).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="No tenant found with that email")
    tenant.is_subscribed = True
    tenant.subscription_status = "comp"
    tenant.plan = body.plan
    db.commit()
    return {
        "id": str(tenant.id),
        "email": tenant.email,
        "is_subscribed": tenant.is_subscribed,
        "subscription_status": tenant.subscription_status,
        "plan": tenant.plan,
    }
