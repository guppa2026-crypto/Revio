from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/tenant", tags=["Tenant"])


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    return {"name": tenant.name, "tone_guidance": tenant.tone_guidance or ""}


class ToneGuidanceUpdate(BaseModel):
    tone_guidance: str = Field(max_length=1000)


@router.put("/tone-guidance")
def update_tone_guidance(
    data: ToneGuidanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.tone_guidance = data.tone_guidance.strip() or None
    db.commit()
    return {"tone_guidance": tenant.tone_guidance or ""}
