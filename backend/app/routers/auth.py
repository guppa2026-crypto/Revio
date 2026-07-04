import hashlib
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.user import TenantCreate, UserLogin, Token
from app.utils.security import (
    hash_password, verify_password, create_access_token, decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, create_password_reset_token, decode_password_reset_token,
)
from app.utils.dependencies import get_current_user
from app.utils.limiter import limiter
from app.utils.redis_client import get_redis
from app.services.email_service import send_new_signup_notification, send_password_reset_email
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

_PASSWORD_RULES = re.compile(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$'
)

_COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds


def _validate_password(password: str) -> None:
    if not _PASSWORD_RULES.match(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password must be at least 8 characters and include an uppercase letter, "
                "a lowercase letter, a number, and a special character."
            ),
        )


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,   # HTTPS only in production
        samesite="lax",              # safe for same-site cross-origin (frontend ↔ api subdomain)
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/register", response_model=Token)
@limiter.limit("5/minute")
def register(request: Request, response: Response, data: TenantCreate, db: Session = Depends(get_db)):
    _validate_password(data.password)

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    tenant = Tenant(name=data.name, email=data.email)
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.name,
        is_owner=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    token = create_access_token(data={"sub": str(user.id), "tenant_id": str(tenant.id)})
    _set_auth_cookie(response, token)
    send_new_signup_notification(data.name, data.email)

    return {"access_token": token, "token_type": "bearer", "user": user, "tenant": tenant}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
@limiter.limit("5/minute")
def change_password(
    request: Request,
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    _validate_password(data.new_password)
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, response: Response, data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    token = create_access_token(data={"sub": str(user.id), "tenant_id": str(tenant.id)})
    _set_auth_cookie(response, token)

    return {"access_token": token, "token_type": "bearer", "user": user, "tenant": tenant}


@router.post("/logout")
def logout(request: Request, response: Response):
    """Blacklist the current token and clear the auth cookie."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        payload = decode_access_token(token)
        if payload:
            r = get_redis()
            if r:
                remaining = int(payload.get("exp", 0) - datetime.now(timezone.utc).timestamp())
                if remaining > 0:
                    r.set(f"jwt_bl:{hashlib.sha256(token.encode()).hexdigest()}", "1", ex=remaining)
    response.delete_cookie(key="access_token", path="/", samesite="lax")
    return {"message": "Logged out"}


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        fingerprint = user.hashed_password[:16]
        token = create_password_reset_token(user.email, fingerprint)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_password_reset_email(user.email, reset_url)
    # Always 200 — don't reveal whether the email exists
    return {"message": "If that email is registered, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_password_reset_token(data.token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link is invalid or has expired.")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link is invalid or has expired.")

    if user.hashed_password[:16] != payload.get("fp"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link has already been used.")

    _validate_password(data.new_password)
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now log in."}
