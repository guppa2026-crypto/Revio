from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Review SaaS"
    DEBUG: bool = False
    SECRET_KEY: str

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"

    OPENAI_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID: str = ""
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # URLs — set these per environment in .env
    GOOGLE_OAUTH_REDIRECT_URI: str = "http://localhost:8000/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Admin access — comma-separated list of email addresses
    ADMIN_EMAILS: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
