from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

TRIAL_DAYS = 7
TRIAL_REPLY_LIMIT = 5
STARTER_REPLY_LIMIT = 30


def _in_trial(tenant) -> bool:
    created = tenant.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return not tenant.is_subscribed and datetime.now(timezone.utc) < created + timedelta(days=TRIAL_DAYS)


def get_reply_limit(tenant) -> int | None:
    """Return the AI reply cap for this tenant, or None for unlimited."""
    if tenant.is_subscribed:
        if tenant.subscription_status == "comp":
            return None
        if tenant.plan == "starter":
            return STARTER_REPLY_LIMIT
        return None  # pro or legacy (plan=None) = unlimited
    if _in_trial(tenant):
        return TRIAL_REPLY_LIMIT
    return 0  # expired trial, no subscription


def get_replies_used(tenant_id, db: Session, *, all_time: bool = False) -> int:
    """Count reviews that have a generated reply, scoped to this calendar month unless all_time=True."""
    from app.models.review import Review
    q = db.query(func.count(Review.id)).filter(
        Review.tenant_id == tenant_id,
        Review.generated_reply.isnot(None),
    )
    if not all_time:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        q = q.filter(Review.created_at >= month_start)
    return q.scalar() or 0


def at_reply_limit(tenant, db: Session) -> bool:
    limit = get_reply_limit(tenant)
    if limit is None:
        return False
    if limit == 0:
        return True
    all_time = not tenant.is_subscribed  # trial counts lifetime; subscribers count monthly
    used = get_replies_used(tenant.id, db, all_time=all_time)
    return used >= limit
