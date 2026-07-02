from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
from app.database import Base
from app.utils.crypto import EncryptedString
from sqlalchemy.orm import relationship


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    is_subscribed = Column(Boolean, default=False)
    subscription_status = Column(String, nullable=True)  # active | past_due | canceled | trialing | comp
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    google_access_token = Column(EncryptedString, nullable=True)
    google_refresh_token = Column(EncryptedString, nullable=True)
    google_token_expiry = Column(DateTime, nullable=True)
    google_account_id = Column(String, nullable=True)
    google_location_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    reviews = relationship("Review", back_populates="tenant")

    def __repr__(self):
        return f"<Tenant {self.name}>"
