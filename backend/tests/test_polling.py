"""Tests for polling Google reviews: per-tenant de-duplication and pagination."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.models.review import Review


def _google_review(review_id, stars="FIVE", replied=False):
    rd = {"reviewId": review_id, "starRating": stars, "comment": "Great",
          "reviewer": {"displayName": "Pat"}, "createTime": "2026-10-01T10:00:00Z"}
    if replied:
        rd["reviewReply"] = {"comment": "Thanks"}
    return rd


@pytest.fixture
def connected_tenant(make_user, db):
    def _factory(email):
        tenant, _ = make_user(email=email, is_subscribed=True)
        tenant.google_access_token = "t"
        tenant.google_refresh_token = "r"
        tenant.google_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        tenant.google_account_id = "accounts/1"
        tenant.google_location_id = "locations/1"
        db.commit()
        return tenant
    return _factory


def _poll(tenant, db, reviews):
    from app.tasks import scheduler
    with patch.object(scheduler, "google_get_reviews", new=MagicMock(return_value=reviews)), \
         patch.object(scheduler, "run_review_processing"):
        scheduler._poll_tenant(tenant, db)


def test_same_google_review_imported_for_two_tenants(connected_tenant, db):
    """Two businesses connected to the same location each get the review."""
    a = connected_tenant("a@test.com")
    b = connected_tenant("b@test.com")

    _poll(a, db, [_google_review("shared-1")])
    _poll(b, db, [_google_review("shared-1")])

    assert db.query(Review).filter(Review.google_review_id == "shared-1").count() == 2


def test_poll_skips_already_imported(connected_tenant, db):
    tenant = connected_tenant("c@test.com")
    _poll(tenant, db, [_google_review("r1")])
    _poll(tenant, db, [_google_review("r1"), _google_review("r2", replied=True)])

    statuses = {r.google_review_id: r.status for r in db.query(Review).all()}
    assert statuses == {"r1": "processing", "r2": "posted"}


def test_get_reviews_follows_pages_until_known_review():
    from app.services import google_service

    pages = [
        {"reviews": [{"reviewId": "new-1"}, {"reviewId": "new-2"}], "nextPageToken": "p2"},
        {"reviews": [{"reviewId": "new-3"}, {"reviewId": "old-1"}], "nextPageToken": "p3"},
        {"reviews": [{"reviewId": "old-2"}]},
    ]
    responses = [MagicMock(json=MagicMock(return_value=p)) for p in pages]
    with patch("app.services.google_service.httpx.Client") as client_cls:
        get = MagicMock(side_effect=responses)
        client_cls.return_value.__enter__.return_value.get = get
        result = google_service.get_reviews("t", "accounts/1", "locations/1", known_ids={"old-1"})

    assert [r["reviewId"] for r in result] == ["new-1", "new-2", "new-3", "old-1"]
    assert get.call_count == 2
    assert get.call_args_list[1].kwargs["params"]["pageToken"] == "p2"
