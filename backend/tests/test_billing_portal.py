"""Tests for POST /billing/portal."""
from unittest.mock import patch


def test_billing_portal_returns_url(client, make_user, db):
    from app.models.tenant import Tenant
    tenant, _ = make_user(email="portal@test.com", is_subscribed=True)
    tenant.stripe_customer_id = "cus_portal123"
    db.commit()

    client.post("/auth/login", json={"email": "portal@test.com", "password": "TestPass1!"})

    with patch(
        "app.routers.billing.create_portal_session",
        return_value="https://billing.stripe.com/portal/xyz",
    ):
        res = client.post("/billing/portal")

    assert res.status_code == 200
    assert res.json()["portal_url"] == "https://billing.stripe.com/portal/xyz"


def test_billing_portal_no_customer_id_returns_400(client, make_user):
    """Tenant without a stripe_customer_id can't open the portal."""
    make_user(email="noportal@test.com", is_subscribed=True)
    client.post("/auth/login", json={"email": "noportal@test.com", "password": "TestPass1!"})

    res = client.post("/billing/portal")
    assert res.status_code == 400
    assert "No billing account" in res.json()["detail"]


def test_billing_portal_unauthenticated(client):
    res = client.post("/billing/portal")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Checkout — must not create a second subscription
# ---------------------------------------------------------------------------

def test_checkout_blocked_while_past_due(client, make_user, db):
    tenant, _ = make_user(email="pastdue@test.com", is_subscribed=False)
    tenant.subscription_status = "past_due"
    tenant.stripe_customer_id = "cus_old"
    tenant.stripe_subscription_id = "sub_old"
    db.commit()
    client.post("/auth/login", json={"email": "pastdue@test.com", "password": "TestPass1!"})

    with patch("app.routers.billing.create_checkout_session") as create:
        res = client.post("/billing/create-checkout", json={"plan": "starter"})

    assert res.status_code == 409
    create.assert_not_called()


def test_checkout_reuses_existing_stripe_customer(client, make_user, db):
    tenant, _ = make_user(email="returning@test.com", is_subscribed=False)
    tenant.subscription_status = "canceled"
    tenant.stripe_customer_id = "cus_returning"
    db.commit()
    client.post("/auth/login", json={"email": "returning@test.com", "password": "TestPass1!"})

    with patch("app.services.billing_service.stripe.checkout.Session.create") as create,          patch.dict("app.services.billing_service.PLAN_PRICE_IDS", {"pro": "price_pro"}):
        create.return_value.url = "https://checkout.stripe.com/x"
        res = client.post("/billing/create-checkout", json={"plan": "pro"})

    assert res.status_code == 200
    assert create.call_args.kwargs["customer"] == "cus_returning"
    assert "customer_email" not in create.call_args.kwargs



# ---------------------------------------------------------------------------
# Status and cancellation work with real Stripe SDK objects
# ---------------------------------------------------------------------------

def _stripe_sub(**fields):
    from stripe import Subscription
    return Subscription.construct_from({"id": "sub_1", "object": "subscription", **fields}, "sk_test")


def test_billing_status_reads_period_end_from_sdk_object(client, make_user, db):
    tenant, _ = make_user(email="status@test.com", is_subscribed=True)
    tenant.stripe_subscription_id = "sub_1"
    db.commit()
    client.post("/auth/login", json={"email": "status@test.com", "password": "TestPass1!"})

    sub = _stripe_sub(cancel_at_period_end=False,
                      items={"object": "list", "data": [{"id": "si_1", "current_period_end": 1800000000}]})
    with patch("app.services.billing_service.stripe.Subscription.retrieve", return_value=sub):
        res = client.get("/billing/status")

    assert res.status_code == 200
    assert res.json()["current_period_end"] == 1800000000
    assert res.json()["cancel_at_period_end"] is False


def test_cancel_takes_effect_at_period_end(client, make_user, db):
    tenant, _ = make_user(email="cancel@test.com", is_subscribed=True)
    tenant.stripe_subscription_id = "sub_1"
    db.commit()
    client.post("/auth/login", json={"email": "cancel@test.com", "password": "TestPass1!"})

    sub = _stripe_sub(cancel_at_period_end=True, current_period_end=1800000000)
    with patch("app.services.billing_service.stripe.Subscription.modify", return_value=sub) as modify:
        res = client.post("/billing/cancel")

    assert res.status_code == 200
    modify.assert_called_once_with("sub_1", cancel_at_period_end=True)
    assert res.json()["current_period_end"] == 1800000000
    db.refresh(tenant)
    assert tenant.is_subscribed is True  # access continues until Stripe ends the subscription
