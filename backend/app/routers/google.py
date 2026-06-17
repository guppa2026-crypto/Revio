import httpx
import urllib.parse
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.config import settings
from app.services.google_service import (
    refresh_access_token, get_accounts, get_locations, get_reviews, post_reply
)


class SelectLocationRequest(BaseModel):
    account_id: str
    location_id: str


class ReplyRequest(BaseModel):
    reply: str

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/google", tags=["google"])

SCOPES = ["https://www.googleapis.com/auth/business.manage"]


@router.get("/connect")
def google_connect(current_user: User = Depends(get_current_user)):
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": "https://revio-production-4d73.up.railway.app/google/callback",
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": str(current_user.tenant_id),
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return {"auth_url": url}


@router.get("/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": "https://revio-production-4d73.up.railway.app/google/callback",
                "grant_type": "authorization_code",
            }
        )
    tokens = token_res.json()
    if "error" in tokens:
        raise HTTPException(status_code=400, detail=tokens["error"])

    tenant = db.query(Tenant).filter(Tenant.id == state).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.google_access_token = tokens.get("access_token")
    tenant.google_refresh_token = tokens.get("refresh_token")
    tenant.google_token_expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
    db.commit()
    logger.info("Google OAuth completed for tenant %s", tenant.id)

    return RedirectResponse("https://reviodigital.uk/dashboard?google=connected")


@router.get("/status")
def google_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    return {
        "connected": bool(tenant.google_access_token),
        "account_id": tenant.google_account_id,
        "location_id": tenant.google_location_id,
    }


@router.post("/disconnect")
def google_disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.google_access_token = None
    tenant.google_refresh_token = None
    tenant.google_token_expiry = None
    tenant.google_account_id = None
    tenant.google_location_id = None
    db.commit()
    return {"message": "Google disconnected"}


@router.get("/debug")
async def google_debug(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Temporary debug endpoint — returns raw Google API response."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        return {"error": "No Google token stored for this account"}
    try:
        token = await refresh_access_token(tenant, db)
    except Exception as e:
        return {"error": f"Token refresh failed: {e}"}

    results = {}
    async with httpx.AsyncClient() as client:
        # Check what scopes this token actually has
        ti = await client.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={token}")
        results["token_info"] = ti.json()

        # Raw accounts response
        ar = await client.get(
            "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
            headers={"Authorization": f"Bearer {token}"}
        )
        results["accounts_response"] = ar.json()
        results["accounts_status"] = ar.status_code

    return results


@router.get("/accounts")
async def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    try:
        token = await refresh_access_token(tenant, db)
        accounts = await get_accounts(token)
        return {"accounts": accounts}
    except Exception:
        logger.exception("Failed to fetch Google accounts for tenant %s", current_user.tenant_id)
        raise HTTPException(status_code=502, detail="Failed to fetch Google accounts")


@router.get("/locations/{account_id:path}")
async def list_locations(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all locations for a GMB account."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    try:
        token = await refresh_access_token(tenant, db)
        locations = await get_locations(token, account_id)
        return {"locations": locations}
    except Exception:
        logger.exception("Failed to fetch locations for account %s", account_id)
        raise HTTPException(status_code=502, detail="Failed to fetch locations")


@router.post("/select-location")
async def select_location(
    payload: SelectLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.google_account_id = payload.account_id
    tenant.google_location_id = payload.location_id
    db.commit()
    return {"message": "Location saved"}


@router.get("/reviews")
async def fetch_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch reviews from Google for the tenant's selected location."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    if not tenant.google_account_id or not tenant.google_location_id:
        raise HTTPException(status_code=400, detail="No location selected — call /select-location first")
    try:
        token = await refresh_access_token(tenant, db)
        reviews = await get_reviews(token, tenant.google_account_id, tenant.google_location_id)
        return {"reviews": reviews, "count": len(reviews)}
    except Exception:
        logger.exception("Failed to fetch reviews from Google for tenant %s", current_user.tenant_id)
        raise HTTPException(status_code=502, detail="Failed to fetch reviews from Google")


@router.post("/reviews/{review_id}/reply")
async def reply_to_review(
    review_id: str,
    payload: ReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    if not tenant.google_account_id or not tenant.google_location_id:
        raise HTTPException(status_code=400, detail="No location selected")
    try:
        token = await refresh_access_token(tenant, db)
        result = await post_reply(token, tenant.google_account_id, tenant.google_location_id, review_id, payload.reply)
        return {"message": "Reply posted", "result": result}
    except Exception:
        logger.exception("Failed to post reply to Google for review %s", review_id)
        raise HTTPException(status_code=502, detail="Failed to post reply to Google")