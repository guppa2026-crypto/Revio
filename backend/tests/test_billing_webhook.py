"""Tests for the Stripe billing webhook: signature check, event handling, idempotency."""
import json
from unittest.mock import patch

import pytest
import stripe


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_event(event_type: str, obj: dict, event_id: str = "evt_test_001") -> dict:
    return {"type": event_type, "id": event_id, "data": {"object": obj}}


def _post(client, event: dict) -> object:
    """POST a webhook event, bypassing real Stripe signature verification."""
    with patch("stripe.Webhook.construct_event", return_value=event):
        return client.post(
            "/billing/webhook",
            content=json.dumps(event),
            headers={"stripe-signature": "t=1,v1=fake"},
        )


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------

def test_invalid_signature_rejected(client):
    with patch(
        "stripe.Webhook.construct_event",
        side_effect=stripe.error.SignatureVerificationError("bad", "sig"),
    ):
        res = client.post(
            "/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "bad"},
        )
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# checkout.session.completed — activates subscription
# ---------------------------------------------------------------------------

def test_checkout_completed_activates_tenant(client, make_user, db):
    from app.models.tenant import Tenant

    tenant, _ = make_user(email="checkout@test.com", is_subscribed=False)
    event = _make_event(
        "checkout.session.completed",
        {
            "metadata": {"tenant_id": str(tenant.id)},
            "customer": "cus_abc123",
            "subscription": "sub_abc123",
        },
    )
    res = _post(client, event)
    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.is_subscribed is True
    assert tenant.stripe_customer_id == "cus_abc123"
    assert tenant.stripe_subscription_id == "sub_abc123"
    assert tenant.subscription_status == "active"


def test_checkout_missing_tenant_id_logs_and_returns_ok(client):
    """Missing tenant_id in metadata should not crash — just log and return 200."""
    event = _make_event(
        "checkout.session.completed",
        {"metadata": {}, "customer": "cus_x", "subscription": "sub_x"},
    )
    res = _post(client, event)
    assert res.status_code == 200


def test_checkout_unknown_tenant_returns_ok(client):
    event = _make_event(
        "checkout.session.completed",
        {
            "metadata": {"tenant_id": "00000000-0000-0000-0000-000000000000"},
            "customer": "cus_x",
            "subscription": "sub_x",
        },
    )
    res = _post(client, event)
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# customer.subscription.updated
# ---------------------------------------------------------------------------

def test_subscription_updated_past_due(client, make_user, db):
    tenant, _ = make_user(email="pastdue@test.com", is_subscribed=True)
    tenant.stripe_subscription_id = "sub_pastdue"
    db.commit()

    event = _make_event("customer.subscription.updated", {"id": "sub_pastdue", "status": "past_due"})
    res = _post(client, event)
    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.subscription_status == "past_due"
    assert tenant.is_subscribed is False


def test_subscription_updated_reactivated(client, make_user, db):
    tenant, _ = make_user(email="reactive@test.com", is_subscribed=False)
    tenant.stripe_subscription_id = "sub_reactive"
    db.commit()

    event = _make_event("customer.subscription.updated", {"id": "sub_reactive", "status": "active"})
    res = _post(client, event)
    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.is_subscribed is True


# ---------------------------------------------------------------------------
# customer.subscription.deleted
# ---------------------------------------------------------------------------

def test_subscription_deleted_deactivates_tenant(client, make_user, db):
    tenant, _ = make_user(email="deleted@test.com", is_subscribed=True)
    tenant.stripe_subscription_id = "sub_delete_me"
    db.commit()

    event = _make_event("customer.subscription.deleted", {"id": "sub_delete_me"})
    res = _post(client, event)
    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.is_subscribed is False
    assert tenant.subscription_status == "canceled"


# ---------------------------------------------------------------------------
# invoice.payment_failed
# ---------------------------------------------------------------------------

def test_payment_failed_marks_past_due(client, make_user, db):
    tenant, _ = make_user(email="failed@test.com", is_subscribed=True)
    tenant.stripe_customer_id = "cus_failed"
    db.commit()

    event = _make_event("invoice.payment_failed", {"customer": "cus_failed"})
    res = _post(client, event)
    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.is_subscribed is False
    assert tenant.subscription_status == "past_due"


# ---------------------------------------------------------------------------
# Idempotency — duplicate events are skipped
# ---------------------------------------------------------------------------

def test_duplicate_event_skipped(client, make_user, db):
    tenant, _ = make_user(email="idem@test.com", is_subscribed=False)
    event = _make_event(
        "checkout.session.completed",
        {
            "metadata": {"tenant_id": str(tenant.id)},
            "customer": "cus_idem",
            "subscription": "sub_idem",
        },
        event_id="evt_unique_001",
    )

    # First call: new event → processed, tenant activated
    with patch("stripe.Webhook.construct_event", return_value=event), \
         patch("app.routers.billing._mark_event_processed", return_value=True):
        res1 = client.post(
            "/billing/webhook",
            content=json.dumps(event),
            headers={"stripe-signature": "t=1,v1=fake"},
        )
    assert res1.status_code == 200
    db.refresh(tenant)
    assert tenant.is_subscribed is True

    # Reset to verify second call is skipped
    tenant.is_subscribed = False
    db.commit()

    # Second call: duplicate event → skipped, tenant NOT reactivated
    with patch("stripe.Webhook.construct_event", return_value=event), \
         patch("app.routers.billing._mark_event_processed", return_value=False):
        res2 = client.post(
            "/billing/webhook",
            content=json.dumps(event),
            headers={"stripe-signature": "t=1,v1=fake"},
        )
    assert res2.status_code == 200
    db.refresh(tenant)
    assert tenant.is_subscribed is False  # unchanged — was skipped


# ---------------------------------------------------------------------------
# Unknown event type
# ---------------------------------------------------------------------------

def test_unknown_event_type_returns_ok(client):
    event = _make_event("some.unknown.event", {"id": "obj_x"})
    res = _post(client, event)
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# A failed delivery must not be deduplicated away — Stripe's retry is processed
# ---------------------------------------------------------------------------

def test_failed_event_is_processed_on_retry(make_user, db):
    from fastapi.testclient import TestClient
    import app.routers.billing as billing
    from app.main import app

    tenant, _ = make_user(email="retry@test.com", is_subscribed=False)
    event = _make_event(
        "checkout.session.completed",
        {"metadata": {"tenant_id": str(tenant.id)}, "customer": "cus_r", "subscription": "sub_r"},
        event_id="evt_retry_001",
    )

    # Dedup keys held in a set standing in for Redis
    seen: set[str] = set()

    def mark(event_id):
        if event_id in seen:
            return False
        seen.add(event_id)
        return True

    class FakeRedis:
        def delete(self, key):
            seen.discard(key.removeprefix("stripe_evt:"))

    real_handle = billing._handle_event
    calls = {"n": 0}

    def flaky_handle(*args):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("transient DB failure")
        return real_handle(*args)

    client = TestClient(app, raise_server_exceptions=False)
    with patch.object(billing, "_mark_event_processed", side_effect=mark),          patch.object(billing, "_redis", FakeRedis()),          patch.object(billing, "_handle_event", side_effect=flaky_handle),          patch("stripe.Webhook.construct_event", return_value=event):
        first = client.post("/billing/webhook", content=json.dumps(event), headers={"stripe-signature": "x"})
        retry = client.post("/billing/webhook", content=json.dumps(event), headers={"stripe-signature": "x"})

    assert first.status_code == 500
    assert retry.status_code == 200
    db.refresh(tenant)
    assert tenant.is_subscribed is True


# ---------------------------------------------------------------------------
# Real signature verification — no mocking of the Stripe SDK
# ---------------------------------------------------------------------------

def _signed(payload: str) -> str:
    import hashlib
    import hmac
    import time
    from app.config import settings
    ts = int(time.time())
    sig = hmac.new(settings.STRIPE_WEBHOOK_SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


def test_genuinely_signed_checkout_event_activates_tenant(client, make_user, db):
    """Regression: the SDK's StripeObject has no .get(), which broke every real webhook."""
    tenant, _ = make_user(email="realsig@test.com", is_subscribed=False)
    payload = json.dumps({
        "id": "evt_real_001", "object": "event", "type": "checkout.session.completed",
        "data": {"object": {
            "object": "checkout.session",
            "metadata": {"tenant_id": str(tenant.id), "plan": "starter"},
            "customer": "cus_real", "subscription": "sub_real",
        }},
    })

    res = client.post("/billing/webhook", content=payload, headers={"stripe-signature": _signed(payload)})

    assert res.status_code == 200
    db.refresh(tenant)
    assert tenant.is_subscribed is True
    assert tenant.plan == "starter"


def test_tampered_payload_rejected(client):
    payload = json.dumps({"id": "evt_x", "type": "checkout.session.completed", "data": {"object": {}}})
    res = client.post("/billing/webhook", content=payload.replace("evt_x", "evt_y"),
                      headers={"stripe-signature": _signed(payload)})
    assert res.status_code == 400
