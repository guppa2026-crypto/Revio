import httpx
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.tenant import Tenant
from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMB_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1"
REVIEWS_BASE = "https://mybusinessreviews.googleapis.com/v1"


async def refresh_access_token(tenant: Tenant, db: Session) -> str:
    """Refresh the access token if expired. Returns a valid access token."""
    if tenant.google_token_expiry and datetime.utcnow() < tenant.google_token_expiry - timedelta(minutes=5):
        return tenant.google_access_token

    if not tenant.google_refresh_token:
        raise Exception("No refresh token available — user must reconnect Google")

    async with httpx.AsyncClient() as client:
        res = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": tenant.google_refresh_token,
            "grant_type": "refresh_token",
        })

    data = res.json()
    if "error" in data:
        raise Exception(f"Token refresh failed: {data['error']}")

    tenant.google_access_token = data["access_token"]
    tenant.google_token_expiry = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
    db.commit()
    logger.info("Refreshed Google access token for tenant %s", tenant.id)
    return tenant.google_access_token


async def get_accounts(access_token: str) -> list:
    """Fetch all Google My Business accounts for this user."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GMB_BASE}/accounts",
            headers={"Authorization": f"Bearer {access_token}"}
        )
    data = res.json()
    if "error" in data:
        raise Exception(f"Failed to fetch accounts: {data['error']}")
    return data.get("accounts", [])


async def get_locations(access_token: str, account_id: str) -> list:
    """Fetch all locations for a given GMB account."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{GMB_BASE}/{account_id}/locations",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"readMask": "name,title,storefrontAddress"}
        )
    data = res.json()
    if "error" in data:
        raise Exception(f"Failed to fetch locations: {data['error']}")
    return data.get("locations", [])


async def get_reviews(access_token: str, location_id: str) -> list:
    """Fetch all reviews for a given location."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{REVIEWS_BASE}/{location_id}/reviews",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"pageSize": 50}
        )
    data = res.json()
    if "error" in data:
        raise Exception(f"Failed to fetch reviews: {data['error']}")
    return data.get("reviews", [])


async def post_reply(access_token: str, location_id: str, review_id: str, reply_text: str) -> dict:
    """Post a reply to a Google review."""
    async with httpx.AsyncClient() as client:
        res = await client.put(
            f"{REVIEWS_BASE}/{location_id}/reviews/{review_id}/reply",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={"comment": reply_text}
        )
    data = res.json()
    if "error" in data:
        raise Exception(f"Failed to post reply: {data['error']}")
    return data