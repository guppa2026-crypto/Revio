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
