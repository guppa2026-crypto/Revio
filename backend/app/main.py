import uuid as _uuid_mod
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers import auth, reviews, billing, admin, google, analytics
from app.routers import settings as settings_router
from app.utils.dependencies import get_current_user
from app.utils.limiter import limiter
from app.database import engine
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.config import settings

import logging
logger = logging.getLogger(__name__)

if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.05,
        send_default_pii=False,
    )


def _run_migrations():
    """Run Alembic migrations on startup so the schema is always current."""
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic migrations applied successfully")
    except Exception as exc:
        logger.exception("Alembic migration FAILED — app may be running with stale schema: %s", exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _run_migrations()
    start_scheduler()
    yield
    stop_scheduler()


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign a unique ID to every request for log correlation."""
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(_uuid_mod.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response."""
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title="Review SaaS API",
    description="AI-powered review management platform",
    version="0.1.0",
    lifespan=lifespan,
    # Hide interactive docs in production to reduce attack surface
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers must be added before CORS so they apply to all responses
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestIDMiddleware)

app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(google.router)
app.include_router(settings_router.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Review SaaS API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
    }
