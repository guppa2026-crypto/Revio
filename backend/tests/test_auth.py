"""Tests for authentication endpoints: register, login, logout, change-password."""


def test_register_success(client):
    res = client.post(
        "/auth/register",
        json={"name": "Acme Ltd", "email": "acme@test.com", "password": "TestPass1!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "acme@test.com"
    # httpOnly cookie must be set by the server
    assert "access_token" in res.cookies


def test_register_weak_password_no_uppercase(client):
    res = client.post(
        "/auth/register",
        json={"name": "Acme", "email": "x@test.com", "password": "testpass1!"},
    )
    assert res.status_code == 400
    assert "uppercase" in res.json()["detail"]


def test_register_weak_password_no_number(client):
    res = client.post(
        "/auth/register",
        json={"name": "Acme", "email": "x@test.com", "password": "TestPass!!"},
    )
    assert res.status_code == 400


def test_register_weak_password_too_short(client):
    res = client.post(
        "/auth/register",
        json={"name": "Acme", "email": "x@test.com", "password": "Te1!"},
    )
    assert res.status_code == 400


def test_register_duplicate_email(client, make_user):
    make_user(email="dup@test.com")
    res = client.post(
        "/auth/register",
        json={"name": "Another", "email": "dup@test.com", "password": "TestPass1!"},
    )
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


def test_login_success(client, make_user):
    make_user(email="login@test.com")
    res = client.post("/auth/login", json={"email": "login@test.com", "password": "TestPass1!"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert "access_token" in res.cookies


def test_login_wrong_password(client, make_user):
    make_user(email="wp@test.com")
    res = client.post("/auth/login", json={"email": "wp@test.com", "password": "WrongPass9!"})
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]


def test_login_nonexistent_user(client):
    res = client.post("/auth/login", json={"email": "ghost@test.com", "password": "TestPass1!"})
    assert res.status_code == 401
    # Same error as wrong password — don't reveal whether the account exists
    assert "Invalid" in res.json()["detail"]


def test_logout_clears_cookie(client, make_user):
    make_user(email="lo@test.com")
    client.post("/auth/login", json={"email": "lo@test.com", "password": "TestPass1!"})
    res = client.post("/auth/logout")
    assert res.status_code == 200
    # After logout the cookie value should be empty
    assert res.cookies.get("access_token", "") == ""


def test_change_password_success(client, make_user):
    make_user(email="cp@test.com")
    client.post("/auth/login", json={"email": "cp@test.com", "password": "TestPass1!"})
    res = client.post(
        "/auth/change-password",
        json={"current_password": "TestPass1!", "new_password": "NewPass2@"},
    )
    assert res.status_code == 200
    # Old password should now fail
    client.post("/auth/logout")
    bad = client.post("/auth/login", json={"email": "cp@test.com", "password": "TestPass1!"})
    assert bad.status_code == 401
    # New password should work
    ok = client.post("/auth/login", json={"email": "cp@test.com", "password": "NewPass2@"})
    assert ok.status_code == 200


def test_change_password_wrong_current(client, make_user):
    make_user(email="cpwrong@test.com")
    client.post("/auth/login", json={"email": "cpwrong@test.com", "password": "TestPass1!"})
    res = client.post(
        "/auth/change-password",
        json={"current_password": "WrongOld9!", "new_password": "NewPass2@"},
    )
    assert res.status_code == 400


def test_change_password_weak_new_password(client, make_user):
    make_user(email="cpweak@test.com")
    client.post("/auth/login", json={"email": "cpweak@test.com", "password": "TestPass1!"})
    res = client.post(
        "/auth/change-password",
        json={"current_password": "TestPass1!", "new_password": "simple"},
    )
    assert res.status_code == 400


def test_protected_endpoint_without_auth(client):
    res = client.get("/reviews/", cookies={})
    assert res.status_code == 401  # no cookie, no Bearer → 401 Unauthorized


def test_admin_access_denied_for_non_admin(client, make_user):
    make_user(email="regular@test.com")
    client.post("/auth/login", json={"email": "regular@test.com", "password": "TestPass1!"})
    res = client.get("/admin/stats")
    assert res.status_code == 403


def test_admin_access_granted_for_admin(client, make_user):
    make_user(email="admin@test.com")  # matches ADMIN_EMAILS from conftest
    client.post("/auth/login", json={"email": "admin@test.com", "password": "TestPass1!"})
    res = client.get("/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_customers" in data
    assert "subscribed" in data
    assert "mrr" in data
