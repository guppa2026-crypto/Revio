from pydantic_settings import BaseSettings
from functools import lru_cache

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
