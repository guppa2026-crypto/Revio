"""Tests for the Google OAuth connect/callback flow, especially binding `state` to the browser."""
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest

from app.models.tenant import Tenant


@pytest.fixture
def google_token_exchange():
    """Mock Google's token endpoint at the google router's call site."""
    response = MagicMock()
    response.json.return_value = {
        "access_token": "ya29.new", "refresh_token": "1//new", "expires_in": 3600,
    }
    with patch("app.routers.google.httpx.Client") as client_cls:
        post = MagicMock(return_value=response)
        client_cls.return_value.__enter__.return_value.post = post
        yield post


def _start_connect(client, email):
    client.post("/auth/login", json={"email": email, "password": "TestPass1!"})
    res = client.get("/google/connect")
    assert res.status_code == 200
    return parse_qs(urlparse(res.json()["auth_url"]).query)["state"][0]


def _location(res):
    return parse_qs(urlparse(res.headers["location"]).query).get("google", [None])[0]


def test_connect_state_is_not_the_raw_tenant_id(client, make_user):
    tenant, _ = make_user(email="owner@test.com")
    state = _start_connect(client, "owner@test.com")
    assert state != str(tenant.id)
    assert client.cookies.get("google_oauth_nonce")


def test_callback_with_matching_cookie_stores_tokens(client, make_user, db, google_token_exchange):
    tenant, _ = make_user(email="owner@test.com")
    state = _start_connect(client, "owner@test.com")

    res = client.get(f"/google/callback?code=abc&state={state}", follow_redirects=False)

    assert res.status_code in (302, 307)
    assert _location(res) == "connected"
    db.refresh(tenant)
    assert tenant.google_refresh_token == "1//new"


def test_callback_from_another_browser_is_rejected(client, make_user, db, google_token_exchange):
    """Attacker starts the flow, then sends the consent link to a victim (who lacks the cookie)."""
    attacker_tenant, _ = make_user(email="attacker@test.com")
    state = _start_connect(client, "attacker@test.com")

    client.cookies.clear()  # the victim's browser
    res = client.get(f"/google/callback?code=victim-code&state={state}", follow_redirects=False)

    assert _location(res) == "error"
    google_token_exchange.assert_not_called()
    db.refresh(attacker_tenant)
    assert attacker_tenant.google_refresh_token is None


def test_callback_with_raw_tenant_id_state_is_rejected(client, make_user, db, google_token_exchange):
    tenant, _ = make_user(email="owner@test.com")
    _start_connect(client, "owner@test.com")

    res = client.get(f"/google/callback?code=abc&state={tenant.id}", follow_redirects=False)

    assert _location(res) == "error"
    google_token_exchange.assert_not_called()


def test_callback_user_denied_consent_redirects(client, google_token_exchange):
    res = client.get("/google/callback?error=access_denied&state=x", follow_redirects=False)
    assert res.status_code in (302, 307)
    assert _location(res) == "cancelled"
    google_token_exchange.assert_not_called()


def test_callback_token_exchange_error_redirects(client, make_user, db, google_token_exchange):
    tenant, _ = make_user(email="owner@test.com")
    state = _start_connect(client, "owner@test.com")
    google_token_exchange.return_value.json.return_value = {"error": "invalid_grant"}

    res = client.get(f"/google/callback?code=abc&state={state}", follow_redirects=False)

    assert _location(res) == "error"
    db.refresh(tenant)
    assert tenant.google_access_token is None
