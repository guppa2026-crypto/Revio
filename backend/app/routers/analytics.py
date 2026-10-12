from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from collections import defaultdict
from app.database import get_db
from app.models.review import Review
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.dependencies import get_current_user
from app.routers.reviews import require_subscription

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# A reply counts as "responded" once it is live on Google (or, for manually imported
# reviews, approved for the owner to copy across). Scheduled replies aren't live yet.
_RESPONDED = ("posted", "approved")


def _utc(dt: datetime) -> datetime:
    """Attach UTC timezone to a naive datetime."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _last_months(now: datetime, count: int) -> list[datetime]:
    """First day of each of the last `count` calendar months, oldest first (incl. this month)."""
    year, month = now.year, now.month
    months = []
    for _ in range(count):
        months.append(datetime(year, month, 1, tzinfo=timezone.utc))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(months))


@router.get("/")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_subscription),
):
    now = datetime.now(timezone.utc)
    months = _last_months(now, 6)

    # Bucket by when the customer wrote the review, not when we imported it — the first
    # Google sync imports the whole backlog at once
    reviews = db.query(Review).filter(
        Review.tenant_id == current_user.tenant_id,
        Review.review_date >= months[0],
        Review.status != "processing",
    ).all()

    by_month: dict[str, list[Review]] = defaultdict(list)
    for r in reviews:
        key = _utc(r.review_date).strftime("%Y-%m")
        by_month[key].append(r)

    # Last 6 calendar months including the current one (oldest → newest)
    monthly = []
    for dt in months:
        key = dt.strftime("%Y-%m")
        month_label = dt.strftime("%b")
        month_reviews = by_month.get(key, [])
        count = len(month_reviews)
        avg = round(sum(r.rating for r in month_reviews) / count, 2) if count else None
        responded = sum(1 for r in month_reviews if r.status in _RESPONDED)
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
    total_responded = sum(1 for r in all_reviews if r.status in _RESPONDED)
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
