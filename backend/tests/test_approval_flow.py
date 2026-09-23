"""Tests for approve & post: dashboard approval, email approval, and the scheduler's auto-post."""
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app.models.review import Review
from app.utils.approval_token import generate_approval_token


@pytest.fixture
def connected(client, make_user, db):
    """Logged-in subscribed user whose tenant has Google connected and a location selected."""
    tenant, _ = make_user(email="owner@test.com", is_subscribed=True)
    tenant.google_access_token = "access-token"
    tenant.google_refresh_token = "refresh-token"
    tenant.google_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    tenant.google_account_id = "accounts/1"
    tenant.google_location_id = "locations/2"
    db.commit()
    client.post("/auth/login", json={"email": "owner@test.com", "password": "TestPass1!"})
    return client, tenant


@pytest.fixture
def make_review(db, connected):
    _, tenant = connected

    def _factory(status="pending", google_review_id="g-review-1", reply="AI draft reply", **kwargs):
        review = Review(
            tenant_id=tenant.id,
            google_review_id=google_review_id,
            reviewer_name="Customer",
            rating=kwargs.pop("rating", 2),
            review_text="Cold coffee.",
            review_date=datetime.now(timezone.utc),
            generated_reply=reply,
            status=status,
            **kwargs,
        )
        db.add(review)
        db.commit()
        return str(review.id)

    return _factory


@pytest.fixture
def google():
    """Mock the Google calls at the reviews router's call site."""
    with (
        patch("app.routers.reviews.refresh_access_token", new=AsyncMock(return_value="fresh-token")),
        patch("app.routers.reviews.post_reply", new=AsyncMock(return_value={"comment": "ok"})) as post,
    ):
        yield post


def _get(client, review_id):
    return client.get(f"/reviews/{review_id}").json()


# ---------------------------------------------------------------------------
# Dashboard approval
# ---------------------------------------------------------------------------

def test_pending_approve_posts_to_google(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")

    res = client.post(f"/reviews/{review_id}/approve")

    assert res.status_code == 200
    assert res.json()["status"] == "posted"
    google.assert_awaited_once_with("fresh-token", "accounts/1", "locations/2", "g-review-1", "AI draft reply")
    data = _get(client, review_id)
    assert data["status"] == "posted"
    assert data["posted_at"] is not None


def test_flagged_approve_posts_to_google(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="flagged", risk_level="high")

    res = client.post(f"/reviews/{review_id}/approve")

    assert res.status_code == 200
    google.assert_awaited_once()
    assert _get(client, review_id)["status"] == "posted"


def test_edited_reply_is_posted_and_stored(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")

    res = client.post(f"/reviews/{review_id}/approve", json={"reply": "  Owner's edited reply.  "})

    assert res.status_code == 200
    assert google.await_args.args[4] == "Owner's edited reply."
    assert _get(client, review_id)["generated_reply"] == "Owner's edited reply."


def test_edited_scheduled_reply_post_now(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="scheduled", rating=5, reply_at=datetime.now(timezone.utc) + timedelta(hours=20))

    res = client.post(f"/reviews/{review_id}/approve", json={"reply": "Edited thanks!"})

    assert res.status_code == 200
    assert google.await_args.args[4] == "Edited thanks!"
    data = _get(client, review_id)
    assert data["status"] == "posted"
    assert data["reply_at"] is None


def test_empty_edited_reply_rejected(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")

    res = client.post(f"/reviews/{review_id}/approve", json={"reply": "   "})

    assert res.status_code == 400
    google.assert_not_awaited()
    assert _get(client, review_id)["status"] == "pending"


def test_google_failure_is_not_reported_as_posted(connected, make_review):
    client, _ = connected
    review_id = make_review(status="flagged")

    with (
        patch("app.routers.reviews.refresh_access_token", new=AsyncMock(return_value="t")),
        patch("app.routers.reviews.post_reply", new=AsyncMock(side_effect=Exception("Failed to post reply: 403"))),
    ):
        res = client.post(f"/reviews/{review_id}/approve", json={"reply": "Edited text"})

    assert res.status_code == 502
    data = _get(client, review_id)
    assert data["status"] == "flagged"          # back in the queue, not posted
    assert data["posted_at"] is None
    assert data["generated_reply"] == "Edited text"  # the owner's edit is kept


def test_google_failure_on_scheduled_does_not_resume_auto_post(connected, make_review):
    client, _ = connected
    review_id = make_review(status="scheduled", rating=5, reply_at=datetime.now(timezone.utc) + timedelta(hours=20))

    with (
        patch("app.routers.reviews.refresh_access_token", new=AsyncMock(return_value="t")),
        patch("app.routers.reviews.post_reply", new=AsyncMock(side_effect=Exception("boom"))),
    ):
        res = client.post(f"/reviews/{review_id}/approve")

    assert res.status_code == 502
    assert _get(client, review_id)["status"] == "pending"


def test_retry_after_success_does_not_post_twice(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")

    first = client.post(f"/reviews/{review_id}/approve")
    second = client.post(f"/reviews/{review_id}/approve")

    assert first.status_code == 200
    assert second.status_code == 409
    google.assert_awaited_once()


def test_approve_without_google_connection_fails(client, make_user, db, google):
    tenant, _ = make_user(email="nogoogle@test.com", is_subscribed=True)
    review = Review(
        tenant_id=tenant.id, google_review_id="g-x", rating=2, review_text="Meh",
        review_date=datetime.now(timezone.utc), generated_reply="Reply", status="pending",
    )
    db.add(review)
    db.commit()
    client.post("/auth/login", json={"email": "nogoogle@test.com", "password": "TestPass1!"})

    res = client.post(f"/reviews/{review.id}/approve")

    assert res.status_code == 400
    google.assert_not_awaited()
    assert _get(client, review.id)["status"] == "pending"


def test_manual_review_approved_without_google_call(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending", google_review_id="manual_abc")

    res = client.post(f"/reviews/{review_id}/approve")

    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    google.assert_not_awaited()


# ---------------------------------------------------------------------------
# Email approval
# ---------------------------------------------------------------------------

def test_email_link_get_does_not_post(connected, make_review, google):
    """Link scanners prefetch GET URLs, so GET must only show a confirmation page."""
    client, _ = connected
    review_id = make_review(status="pending")
    token = generate_approval_token(review_id)

    res = client.get(f"/reviews/approve-via-email?token={token}")

    assert res.status_code == 200
    assert "Approve &amp; post to Google" in res.text
    google.assert_not_awaited()
    assert _get(client, review_id)["status"] == "pending"


def test_email_approval_posts_to_google(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")
    token = generate_approval_token(review_id)

    res = client.post(f"/reviews/approve-via-email?token={token}")

    assert res.status_code == 200
    assert "Reply posted" in res.text
    google.assert_awaited_once()
    assert _get(client, review_id)["status"] == "posted"


def test_email_approval_google_failure(connected, make_review):
    client, _ = connected
    review_id = make_review(status="pending")
    token = generate_approval_token(review_id)

    with (
        patch("app.routers.reviews.refresh_access_token", new=AsyncMock(return_value="t")),
        patch("app.routers.reviews.post_reply", new=AsyncMock(side_effect=Exception("boom"))),
    ):
        res = client.post(f"/reviews/approve-via-email?token={token}")

    assert res.status_code == 502
    assert "Reply not posted" in res.text
    assert _get(client, review_id)["status"] == "pending"


def test_email_approval_retry_does_not_post_twice(connected, make_review, google):
    client, _ = connected
    review_id = make_review(status="pending")
    token = generate_approval_token(review_id)

    client.post(f"/reviews/approve-via-email?token={token}")
    res = client.post(f"/reviews/approve-via-email?token={token}")

    assert "Already actioned" in res.text
    google.assert_awaited_once()


def test_email_approval_invalid_token(client, google):
    res = client.post("/reviews/approve-via-email?token=bad")
    assert res.status_code == 400
    google.assert_not_awaited()


# ---------------------------------------------------------------------------
# Scheduler: low-risk auto-post still works, flagged never auto-posts
# ---------------------------------------------------------------------------

@pytest.fixture
def scheduler_google():
    import app.database  # conftest points SessionLocal at the test DB
    with (
        patch("app.tasks.scheduler.SessionLocal", app.database.SessionLocal),
        patch("app.tasks.scheduler.refresh_access_token", new=AsyncMock(return_value="t")),
        patch("app.tasks.scheduler.post_reply", new=AsyncMock(return_value={})) as post,
    ):
        yield post


def test_scheduler_auto_posts_due_low_risk_reply(connected, make_review, scheduler_google):
    from app.tasks.scheduler import fire_scheduled_replies
    client, _ = connected
    review_id = make_review(status="scheduled", rating=5, risk_level="low",
                            reply_at=datetime.now(timezone.utc) - timedelta(minutes=1))

    asyncio.run(fire_scheduled_replies())

    scheduler_google.assert_awaited_once()
    assert _get(client, review_id)["status"] == "posted"


def test_scheduler_never_posts_flagged_or_pending(connected, make_review, scheduler_google):
    from app.tasks.scheduler import fire_scheduled_replies
    client, _ = connected
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    flagged_id = make_review(status="flagged", risk_level="high", google_review_id="g-f", reply_at=past)
    pending_id = make_review(status="pending", risk_level="medium", google_review_id="g-p", reply_at=past)

    asyncio.run(fire_scheduled_replies())

    scheduler_google.assert_not_awaited()
    assert _get(client, flagged_id)["status"] == "flagged"
    assert _get(client, pending_id)["status"] == "pending"


def test_cancelled_schedule_is_not_auto_posted(connected, make_review, scheduler_google):
    from app.tasks.scheduler import fire_scheduled_replies
    client, _ = connected
    review_id = make_review(status="scheduled", rating=5,
                            reply_at=datetime.now(timezone.utc) + timedelta(hours=20))

    assert client.post(f"/reviews/{review_id}/cancel-schedule").status_code == 200
    asyncio.run(fire_scheduled_replies())

    scheduler_google.assert_not_awaited()
    data = _get(client, review_id)
    assert data["status"] == "pending"
    assert data["reply_at"] is None
