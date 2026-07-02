from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.utils.limiter import limiter

router = APIRouter(prefix="/settings", tags=["settings"])

_MAX_TONE_LEN = 500


class TenantSettingsUpdate(BaseModel):
    tone_instructions: Optional[str] = None


@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    return {"tone_instructions": tenant.tone_instructions or ""}


@router.patch("")
@limiter.limit("20/minute")
def update_settings(
    request: Request,
    data: TenantSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if data.tone_instructions is not None:
        tenant.tone_instructions = data.tone_instructions[:_MAX_TONE_LEN]
    db.commit()
    return {"message": "Settings saved"}
