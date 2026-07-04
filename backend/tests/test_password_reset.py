"""Tests for /auth/forgot-password and /auth/reset-password endpoints."""
from app.utils.security import create_password_reset_token


def test_forgot_password_always_200_known_email(client, make_user):
    make_user(email="user@test.com")
    res = client.post("/auth/forgot-password", json={"email": "user@test.com"})
    assert res.status_code == 200


def test_forgot_password_always_200_unknown_email(client):
    """Don't reveal whether the account exists."""
    res = client.post("/auth/forgot-password", json={"email": "nobody@test.com"})
    assert res.status_code == 200


def test_reset_password_valid_token(client, make_user, db):
    make_user(email="reset@test.com")
    from app.models.user import User
    user = db.query(User).filter(User.email == "reset@test.com").first()
    token = create_password_reset_token(user.email, user.hashed_password[:16])

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "NewPass99!"})
    assert res.status_code == 200

    # Old password no longer works
    bad = client.post("/auth/login", json={"email": "reset@test.com", "password": "TestPass1!"})
    assert bad.status_code == 401

    # New password works
    ok = client.post("/auth/login", json={"email": "reset@test.com", "password": "NewPass99!"})
    assert ok.status_code == 200


def test_reset_password_invalid_token(client):
    res = client.post("/auth/reset-password", json={"token": "invalid.token.here", "new_password": "NewPass99!"})
    assert res.status_code == 400


def test_reset_password_reuse_fails(client, make_user, db):
    """After first use the password fingerprint changes, making the token invalid."""
    make_user(email="reuse@test.com")
    from app.models.user import User
    user = db.query(User).filter(User.email == "reuse@test.com").first()
    token = create_password_reset_token(user.email, user.hashed_password[:16])

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "NewPass99!"})
    assert res.status_code == 200

    res2 = client.post("/auth/reset-password", json={"token": token, "new_password": "AnotherPass1!"})
    assert res2.status_code == 400
    assert "already been used" in res2.json()["detail"]


def test_reset_password_weak_new_password(client, make_user, db):
    make_user(email="weak@test.com")
    from app.models.user import User
    user = db.query(User).filter(User.email == "weak@test.com").first()
    token = create_password_reset_token(user.email, user.hashed_password[:16])

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "simple"})
    assert res.status_code == 400
