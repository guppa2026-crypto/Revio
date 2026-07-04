"""
Pytest configuration for the backend test suite.

All environment variables must be set BEFORE any app imports so Pydantic
Settings picks them up instead of reading the production .env file.
"""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-chars-long!!")
os.environ.setdefault("DATABASE_URL", "sqlite://")   # app's own engine (unused in tests)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_dummy")
os.environ.setdefault("STRIPE_PRICE_ID", "price_test_dummy")
os.environ.setdefault("SENDGRID_API_KEY", "test-sendgrid-key")
os.environ.setdefault("FROM_EMAIL", "no-reply@test.com")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("DEBUG", "true")

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import models so Base.metadata knows about all tables
from app.database import Base, get_db
from app.models.tenant import Tenant  # noqa: F401
from app.models.user import User      # noqa: F401
from app.models.review import Review  # noqa: F401
from app.utils.security import hash_password

# Separate in-memory SQLite engine used only during tests
_TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_TEST_ENGINE)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


# Apply the DB override before importing app so routes pick it up
from app.main import app  # noqa: E402  (must come after env vars)
app.dependency_overrides[get_db] = _override_get_db

# Make background tasks in reviews.py use the same test session factory
import app.database as _app_database
_app_database.SessionLocal = _TestSession


# ---------------------------------------------------------------------------
# Core fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_db():
    """Drop and recreate all tables before every test for full isolation."""
    Base.metadata.create_all(bind=_TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=_TEST_ENGINE)


@pytest.fixture(autouse=True)
def _mock_external_services():
    """Silence all external I/O (email, AI, Redis) globally across every test."""
    with (
        patch("app.services.email_service.send_email", return_value=True),
        patch(
            "app.services.review_processor.analyze_review",
            return_value={"sentiment": "positive", "risk_level": "low", "risk_reason": None},
        ),
        patch("app.services.review_processor.generate_reply", return_value="Thank you for your review!"),
        patch("app.routers.billing._mark_event_processed", return_value=True),
        patch("app.utils.redis_client.get_redis", return_value=None),
        patch("app.utils.dependencies.get_redis", return_value=None),
    ):
        yield


@pytest.fixture(autouse=True)
def _disable_rate_limits():
    """Disable slowapi rate limiting so tests don't hit per-minute caps."""
    from app.utils.limiter import limiter
    original = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = original


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def db():
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user(db):
    """Factory fixture: creates a Tenant + User pair in the test DB."""
    def _factory(
        email: str = "user@test.com",
        password: str = "TestPass1!",
        is_subscribed: bool = False,
        name: str = "Test Business",
    ):
        tenant = Tenant(
            name=name,
            email=email,
            is_subscribed=is_subscribed,
            subscription_status="active" if is_subscribed else None,
        )
        db.add(tenant)
        db.flush()
        user = User(
            tenant_id=tenant.id,
            email=email,
            hashed_password=hash_password(password),
            full_name="Test User",
            is_owner=True,
        )
        db.add(user)
        db.commit()
        return tenant, user

    return _factory


@pytest.fixture
def logged_in_client(client, make_user):
    """Client that is already authenticated as a subscribed user."""
    make_user(email="auth@test.com", is_subscribed=True)
    client.post("/auth/login", json={"email": "auth@test.com", "password": "TestPass1!"})
    return client
