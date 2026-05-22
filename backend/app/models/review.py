from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    # Review details from Google
    google_review_id = Column(String, unique=True, nullable=False)
    reviewer_name = Column(String, nullable=True)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    review_date = Column(DateTime, nullable=False)

    # AI Analysis
    sentiment = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)
    risk_reason = Column(Text, nullable=True)
    generated_reply = Column(Text, nullable=True)

    # Status
    status = Column(String, default="pending", nullable=False)

    # Timestamps
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    tenant = relationship("Tenant", back_populates="reviews")
