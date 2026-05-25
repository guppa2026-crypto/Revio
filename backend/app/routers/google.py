from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.config import settings
import httpx
import urllib.parse
from datetime import datetime, timedelta

router = APIRouter(prefix="/google", tags=["google"])

SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
]

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
    expiry = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
    tenant.google_token_expiry = expiry
    db.commit()

    return RedirectResponse("https://revio-42f3.vercel.app/dashboard?google=connected")

@router.get("/status")
def google_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    return {
        "connected": bool(tenant.google_access_token),
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