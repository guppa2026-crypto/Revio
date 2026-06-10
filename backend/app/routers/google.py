import httpx
import urllib.parse
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
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


@router.get("/accounts")
async def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all GMB accounts for the connected Google user."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    try:
        token = await refresh_access_token(tenant, db)
        accounts = await get_accounts(token)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/locations/{account_id}")
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/select-location")
async def select_location(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save the selected GMB account and location for this tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.google_account_id = payload.get("account_id")
    tenant.google_location_id = payload.get("location_id")
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reviews/{review_id}/reply")
async def reply_to_review(
    review_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Post a reply to a Google review."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    if not tenant.google_account_id or not tenant.google_location_id:
        raise HTTPException(status_code=400, detail="No location selected")
    reply_text = payload.get("reply")
    if not reply_text:
        raise HTTPException(status_code=400, detail="reply field required")
    try:
        token = await refresh_access_token(tenant, db)
        result = await post_reply(token, tenant.google_account_id, tenant.google_location_id, review_id, reply_text)
        return {"message": "Reply posted", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))