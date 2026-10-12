"""Tests for the analytics endpoint: calendar-month buckets and response rate."""
from datetime import datetime, timezone
from unittest.mock import patch

from app.models.review import Review
from app.routers.analytics import _last_months


def test_last_months_are_consecutive_calendar_months():
    # 30-day steps used to skip February and repeat December when run in March
    months = _last_months(datetime(2027, 3, 15, tzinfo=timezone.utc), 6)
    assert [m.strftime("%Y-%m") for m in months] == [
        "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03",
    ]


def test_analytics_buckets_by_review_date(logged_in_client, db):
    from app.models.tenant import Tenant
    tenant = db.query(Tenant).first()
    now = datetime.now(timezone.utc)
    last_month = _last_months(now, 2)[0]
    db.add_all([
        # Written last month but imported today (first Google sync)
        Review(tenant_id=tenant.id, google_review_id="g1", rating=5, review_text="x",
               review_date=last_month.replace(day=10), status="posted"),
        Review(tenant_id=tenant.id, google_review_id="g2", rating=3, review_text="x",
               review_date=now, status="scheduled"),
    ])
    db.commit()

    data = logged_in_client.get("/analytics/").json()

    by_key = {m["month"]: m for m in data["monthly"]}
    assert by_key[last_month.strftime("%Y-%m")]["count"] == 1
    assert by_key[now.strftime("%Y-%m")]["count"] == 1
    # A scheduled reply isn't live yet, so only 1 of 2 counts as responded
    assert data["overall"]["response_rate"] == 0.5
