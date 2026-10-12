import httpx
import hmac
import secrets
import urllib.parse
import logging
from typing import Optional
from uuid import UUID as PyUUID
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.config import settings
from app.services.google_service import refresh_access_token, get_accounts, get_locations


class SelectLocationRequest(BaseModel):
    account_id: str
    location_id: str


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/google", tags=["google"])

SCOPES = ["https://www.googleapis.com/auth/business.manage"]

# The OAuth `state` is a signed token naming the tenant, plus a nonce that must match
# a cookie set on the browser that started the flow. Without the cookie check, anyone
# could send a victim a consent link carrying the attacker's state and capture the
# victim's Google tokens on the attacker's tenant.
_STATE_COOKIE = "google_oauth_nonce"
_STATE_TTL_MINUTES = 10
_STATE_TYPE = "google_oauth"


def _create_oauth_state(tenant_id, nonce: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_STATE_TTL_MINUTES)
    return jwt.encode(
        {"type": _STATE_TYPE, "tid": str(tenant_id), "nonce": nonce, "exp": expire},
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def _verify_oauth_state(state: Optional[str], cookie_nonce: Optional[str]) -> Optional[PyUUID]:
    """Return the tenant id if the state is valid and bound to this browser, else None."""
    if not state or not cookie_nonce:
        return None
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != _STATE_TYPE:
            return None
        if not hmac.compare_digest(str(payload.get("nonce", "")), cookie_nonce):
            return None
        return PyUUID(payload["tid"])
    except (JWTError, KeyError, ValueError):
        return None


def _callback_redirect(result: str) -> RedirectResponse:
    response = RedirectResponse(f"{settings.FRONTEND_URL}/dashboard?google={result}")
    response.delete_cookie(_STATE_COOKIE, path="/google", samesite="lax")
    return response


@router.get("/connect")
def google_connect(response: Response, current_user: User = Depends(get_current_user)):
    nonce = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": _create_oauth_state(current_user.tenant_id, nonce),
    }
    response.set_cookie(
        key=_STATE_COOKIE,
        value=nonce,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",  # sent on the top-level redirect back from Google
        max_age=_STATE_TTL_MINUTES * 60,
        path="/google",
    )
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return {"auth_url": url}


@router.get("/callback")
def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if error or not code:
        # e.g. the user clicked "Cancel" on Google's consent screen
        logger.info("Google OAuth not completed: %s", error or "missing code")
        return _callback_redirect("cancelled")

    tenant_id = _verify_oauth_state(state, request.cookies.get(_STATE_COOKIE))
    if not tenant_id:
        logger.warning("Google OAuth callback rejected: invalid or unbound state")
        return _callback_redirect("error")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        return _callback_redirect("error")

    with httpx.Client() as client:
        token_res = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    tokens = token_res.json()
    if "error" in tokens or not tokens.get("access_token"):
        logger.warning("Google token exchange failed for tenant %s: %s", tenant.id, tokens.get("error"))
        return _callback_redirect("error")

    tenant.google_access_token = tokens.get("access_token")
    tenant.google_refresh_token = tokens.get("refresh_token")
    tenant.google_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    db.commit()
    logger.info("Google OAuth completed for tenant %s", tenant.id)

    return _callback_redirect("connected")


@router.get("/status")
def google_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    try:
        token = refresh_access_token(tenant, db)
        accounts = get_accounts(token)
        return {"accounts": accounts}
    except Exception:
        logger.exception("Failed to fetch Google accounts for tenant %s", current_user.tenant_id)
        raise HTTPException(status_code=502, detail="Failed to fetch Google accounts")


@router.get("/locations/{account_id:path}")
def list_locations(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.google_access_token:
        raise HTTPException(status_code=400, detail="Google not connected")
    try:
        token = refresh_access_token(tenant, db)
        locations = get_locations(token, account_id)
        return {"locations": locations}
    except Exception:
        logger.exception("Failed to fetch locations for account %s", account_id)
        raise HTTPException(status_code=502, detail="Failed to fetch locations")


@router.post("/select-location")
def select_location(
    payload: SelectLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.google_account_id = payload.account_id
    tenant.google_location_id = payload.location_id
    db.commit()
    return {"message": "Location saved"}
