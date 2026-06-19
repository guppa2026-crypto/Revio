from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from app.routers import auth, reviews, billing, admin, google, tenant
from app.utils.dependencies import get_current_user
from app.utils.limiter import limiter
from app.database import engine
from app.tasks.scheduler import start_scheduler, stop_scheduler


def _migrate_db():
    """Add any new columns that don't exist yet (safe to run on every startup)."""
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMP;"
        ))
        conn.execute(text(
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tone_guidance VARCHAR;"
        ))
        conn.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _migrate_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Review SaaS API",
    description="AI-powered review management platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://revio-42f3.vercel.app",
        "https://reviodigital.uk",
        "https://www.reviodigital.uk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(google.router)
app.include_router(tenant.router)

@app.get("/")
def root():
    return {"status": "ok", "message": "Review SaaS API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }
