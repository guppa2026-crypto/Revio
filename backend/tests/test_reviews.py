"""Tests for the reviews router: subscription gate, import validation, workflow."""
import pytest
from datetime import datetime, timezone, timedelta


@pytest.fixture
def unsubscribed_client(client, make_user, db):
    """A logged-in user whose trial has expired and has no subscription."""
    from app.models.tenant import Tenant
    tenant, _ = make_user(email="nosub@test.com", is_subscribed=False)
    # Backdate created_at so the 7-day trial is considered expired
    tenant.created_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    client.post("/auth/login", json={"email": "nosub@test.com", "password": "TestPass1!"})
    return client


@pytest.fixture
def subscribed_client(client, make_user):
    make_user(email="sub@test.com", is_subscribed=True)
    client.post("/auth/login", json={"email": "sub@test.com", "password": "TestPass1!"})
    return client


# ---------------------------------------------------------------------------
# Subscription gate
# ---------------------------------------------------------------------------

def test_list_reviews_blocked_without_subscription(unsubscribed_client):
    res = unsubscribed_client.get("/reviews/")
    assert res.status_code == 403
    assert "trial" in res.json()["detail"].lower() or "subscribe" in res.json()["detail"].lower()


def test_import_blocked_without_subscription(unsubscribed_client):
    res = unsubscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Alice", "rating": 5, "review_text": "Great!"},
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Input validation on /reviews/import
# ---------------------------------------------------------------------------

def test_import_rating_too_high(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Bob", "rating": 6, "review_text": "Great!"},
    )
    assert res.status_code == 422


def test_import_rating_too_low(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Bob", "rating": 0, "review_text": "Terrible!"},
    )
    assert res.status_code == 422


def test_import_text_too_long(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Bob", "rating": 5, "review_text": "x" * 5001},
    )
    assert res.status_code == 422


def test_import_empty_text(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Bob", "rating": 5, "review_text": ""},
    )
    assert res.status_code == 422


def test_import_empty_reviewer_name(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "", "rating": 5, "review_text": "Great!"},
    )
    assert res.status_code == 422


def test_import_reviewer_name_too_long(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "A" * 101, "rating": 5, "review_text": "Great!"},
    )
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# Successful import and review workflow
# ---------------------------------------------------------------------------

def test_import_positive_review_scheduled(subscribed_client):
    """5-star low-risk review should be scheduled for auto-posting."""
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Jane", "rating": 5, "review_text": "Absolutely fantastic service!"},
    )
    assert res.status_code == 200
    review_id = res.json()["id"]
    # Background task runs synchronously in TestClient — fetch final state
    detail = subscribed_client.get(f"/reviews/{review_id}")
    data = detail.json()
    assert data["status"] == "scheduled"
    assert data["generated_reply"] == "Thank you for your review!"
    assert data["reply_at"] is not None


def test_import_low_rating_pending(subscribed_client):
    """3-star low-risk review should stay pending (needs approval)."""
    from unittest.mock import patch
    with patch(
        "app.services.review_processor.analyze_review",
        return_value={"sentiment": "neutral", "risk_level": "low", "risk_reason": None},
    ):
        res = subscribed_client.post(
            "/reviews/import",
            json={"reviewer_name": "Dave", "rating": 3, "review_text": "It was okay."},
        )
    assert res.status_code == 200
    review_id = res.json()["id"]
    detail = subscribed_client.get(f"/reviews/{review_id}")
    assert detail.json()["status"] == "pending"


def test_import_high_risk_flagged(subscribed_client):
    """High-risk review should be flagged for immediate human attention."""
    from unittest.mock import patch
    with patch(
        "app.services.review_processor.analyze_review",
        return_value={"sentiment": "negative", "risk_level": "high", "risk_reason": "Legal threat"},
    ):
        res = subscribed_client.post(
            "/reviews/import",
            json={"reviewer_name": "Angry", "rating": 1, "review_text": "I will sue you!"},
        )
    assert res.status_code == 200
    review_id = res.json()["id"]
    detail = subscribed_client.get(f"/reviews/{review_id}")
    assert detail.json()["status"] == "flagged"


def test_approve_review(subscribed_client):
    # Create a review in "pending" status
    import_res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Pat", "rating": 3, "review_text": "Decent."},
    )
    from unittest.mock import patch
    with patch("app.services.review_processor.analyze_review",
               return_value={"sentiment": "neutral", "risk_level": "low", "risk_reason": None}):
        import_res = subscribed_client.post(
            "/reviews/import",
            json={"reviewer_name": "Pat", "rating": 3, "review_text": "Decent, could be better."},
        )
    review_id = import_res.json()["id"]
    res = subscribed_client.post(f"/reviews/{review_id}/approve")
    assert res.status_code == 200
    assert res.json()["review_id"] == review_id


def test_list_reviews_returns_only_own_tenant(client, make_user):
    """A user must only see their own tenant's reviews."""
    make_user(email="tenant1@test.com", is_subscribed=True)
    client.post("/auth/login", json={"email": "tenant1@test.com", "password": "TestPass1!"})
    client.post(
        "/reviews/import",
        json={"reviewer_name": "Alice", "rating": 5, "review_text": "Great!"},
    )
    client.post("/auth/logout")

    make_user(email="tenant2@test.com", is_subscribed=True)
    client.post("/auth/login", json={"email": "tenant2@test.com", "password": "TestPass1!"})
    res = client.get("/reviews/")
    # tenant2 should see zero reviews (tenant1's review is isolated)
    assert res.status_code == 200
    assert res.json() == []


def test_cancel_schedule(subscribed_client):
    res = subscribed_client.post(
        "/reviews/import",
        json={"reviewer_name": "Sam", "rating": 5, "review_text": "Wonderful!"},
    )
    review_id = res.json()["id"]
    cancel = subscribed_client.post(f"/reviews/{review_id}/cancel-schedule")
    assert cancel.status_code == 200
    # Review should revert to pending
    detail = subscribed_client.get(f"/reviews/{review_id}")
    assert detail.json()["status"] == "pending"
    assert detail.json()["reply_at"] is None


def test_admin_customers_pagination_format(client, make_user):
    """Verify /admin/customers returns the paginated envelope."""
    make_user(email="admin@test.com")
    client.post("/auth/login", json={"email": "admin@test.com", "password": "TestPass1!"})
    res = client.get("/admin/customers")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "customers" in data
    assert isinstance(data["customers"], list)
