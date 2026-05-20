from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.user import TenantCreate, UserLogin, Token
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(data: TenantCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create the tenant (the business)
    tenant = Tenant(
        name=data.name,
        email=data.email
    )
    db.add(tenant)
    db.flush()  # Get the tenant ID without committing

    # Create the user (the owner)
    user = User(
        tenant_id=tenant.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.name,
        is_owner=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    # Create JWT token
    token = create_access_token(data={
        "sub": str(user.id),
        "tenant_id": str(tenant.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "tenant": tenant
    }

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    # Find the user
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check password
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is disabled"
        )

    # Get tenant
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()

    # Create JWT token
    token = create_access_token(data={
        "sub": str(user.id),
        "tenant_id": str(tenant.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "tenant": tenant
    }