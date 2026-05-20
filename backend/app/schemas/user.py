from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class TenantCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    tenant_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class TenantResponse(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    tenant: TenantResponse