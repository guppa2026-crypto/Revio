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
