"""
User and Subscription models for SaaS
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    CREATOR = "creator"
    PRO = "pro"
    TEAM = "team"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"


class User(Base):
    """User account — synced from Clerk"""
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Clerk user ID (user_xxx)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, default="")
    avatar_url = Column(String, default="")

    # Subscription
    tier = Column(SAEnum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    subscription_status = Column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    stripe_customer_id = Column(String, default="")
    stripe_subscription_id = Column(String, default="")

    # Usage tracking
    clips_used_this_month = Column(Integer, default=0)
    usage_reset_date = Column(DateTime, default=datetime.utcnow)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    projects = relationship("Project", back_populates="user")

    @property
    def clip_limit(self) -> int:
        limits = {
            SubscriptionTier.FREE: 3,
            SubscriptionTier.CREATOR: 50,
            SubscriptionTier.PRO: 200,
            SubscriptionTier.TEAM: 500,
        }
        return limits.get(self.tier, 3)

    @property
    def can_create_clip(self) -> bool:
        return self.clips_used_this_month < self.clip_limit

    @property
    def max_resolution(self) -> str:
        resolutions = {
            SubscriptionTier.FREE: "720p",
            SubscriptionTier.CREATOR: "1080p",
            SubscriptionTier.PRO: "4k",
            SubscriptionTier.TEAM: "4k",
        }
        return resolutions.get(self.tier, "720p")

    @property
    def has_watermark(self) -> bool:
        return self.tier == SubscriptionTier.FREE

    def increment_usage(self, count: int = 1):
        self.clips_used_this_month += count

    def reset_usage(self):
        self.clips_used_this_month = 0
        self.usage_reset_date = datetime.utcnow()
