from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.dependencies import get_current_user
from app.routers.reviews import require_subscription

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _utc(dt: datetime) -> datetime:
    """Attach UTC timezone to a naive datetime."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.get("/")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    now = datetime.now(timezone.utc)
    six_months_ago = now - timedelta(days=183)

    reviews = db.query(Review).filter(
        Review.tenant_id == current_user.tenant_id,
        Review.created_at >= six_months_ago,
        Review.status != "processing",
    ).all()

    # Group by YYYY-MM
    by_month: dict[str, list[Review]] = defaultdict(list)
    for r in reviews:
        key = _utc(r.created_at).strftime("%Y-%m")
        by_month[key].append(r)

    # Build last 6 complete months (oldest → newest)
    monthly = []
    for i in range(5, -1, -1):
        dt = now.replace(day=1) - timedelta(days=i * 30)
        key = dt.strftime("%Y-%m")
        month_label = dt.strftime("%b")
        month_reviews = by_month.get(key, [])
        count = len(month_reviews)
        avg = round(sum(r.rating for r in month_reviews) / count, 2) if count else None
        responded = sum(
            1 for r in month_reviews if r.status in ("posted", "approved", "scheduled")
        )
        monthly.append({
            "month": key,
            "label": month_label,
            "count": count,
            "avg_rating": avg,
            "responded": responded,
        })

    # Overall stats across all time (not just last 6 months)
    all_reviews = db.query(Review).filter(
        Review.tenant_id == current_user.tenant_id,
        Review.status != "processing",
    ).all()

    total = len(all_reviews)
    overall_avg = round(sum(r.rating for r in all_reviews) / total, 2) if total else 0.0
    total_responded = sum(
        1 for r in all_reviews if r.status in ("posted", "approved", "scheduled")
    )
    response_rate = round(total_responded / total, 4) if total else 0.0

    # Average time from review created to reply posted (hours), posted reviews only
    posted = [
        r for r in all_reviews
        if r.status == "posted" and r.posted_at and r.created_at
    ]
    if posted:
        avg_reply_hours = round(
            sum(
                (_utc(r.posted_at) - _utc(r.created_at)).total_seconds() / 3600
                for r in posted
            ) / len(posted),
            1,
        )
    else:
        avg_reply_hours = None

    return {
        "monthly": monthly,
        "overall": {
            "total_reviews": total,
            "avg_rating": overall_avg,
            "response_rate": response_rate,
            "avg_reply_hours": avg_reply_hours,
        },
    }
