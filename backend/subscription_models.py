"""Subscription, access control, and payment models."""
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, ForeignKey,
    Index, Float
)
from sqlalchemy.orm import relationship
from models import Base
from timezone_utils import get_utc_now
import uuid


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Subscription Plans
# ---------------------------------------------------------------------------

class SubscriptionPlan(Base):
    """Admin-managed subscription plan definitions."""
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    plan_key = Column(String(50), unique=True, nullable=False, index=True)
    role = Column(String(20), nullable=False)         # 'student' | 'teacher'
    duration = Column(String(20), nullable=False)     # 'monthly' | 'biannual' | 'annual'
    duration_days = Column(Integer, nullable=False)   # 30, 180, 365
    display_name = Column(String(100), nullable=False)
    price_inr = Column(Integer, nullable=False)       # in paise
    original_price_inr = Column(Integer, nullable=True)
    savings_pct = Column(Integer, nullable=True)
    is_popular = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    features = Column(Text, nullable=False, default="[]")  # JSON string
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")
    payment_orders = relationship("PaymentOrder", back_populates="plan")
    allowlist_entries = relationship("EmailAllowlist", back_populates="subscription_plan")

    __table_args__ = (
        Index("idx_sub_plan_role_active", "role", "is_active"),
    )


# ---------------------------------------------------------------------------
# User Subscriptions
# ---------------------------------------------------------------------------

class UserSubscription(Base):
    """Active/historical subscriptions per user."""
    __tablename__ = "user_subscriptions"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), nullable=False, default="inactive")
    # 'active' | 'inactive' | 'trial' | 'grace' | 'expired' | 'suspended'

    started_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    grace_ends_at = Column(DateTime, nullable=True)   # expires_at + 3 days
    trial_ends_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_reason = Column(Text, nullable=True)

    admin_override = Column(Boolean, default=False, nullable=False)
    admin_override_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_override_note = Column(Text, nullable=True)
    admin_override_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payment_orders = relationship("PaymentOrder", back_populates="subscription")
    audit_logs = relationship("SubscriptionAuditLog", back_populates="subscription")

    __table_args__ = (
        Index("idx_usub_user_status", "user_id", "status"),
        Index("idx_usub_expiry", "expires_at", "status"),
    )


# ---------------------------------------------------------------------------
# Payment Orders
# ---------------------------------------------------------------------------

class PaymentOrder(Base):
    """Gateway-agnostic payment orders."""
    __tablename__ = "payment_orders"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True)

    gateway = Column(String(20), nullable=False)          # 'razorpay' | 'cashfree'
    gateway_order_id = Column(String(200), unique=True, nullable=False, index=True)
    gateway_payment_id = Column(String(200), nullable=True)
    gateway_signature = Column(String(500), nullable=True)

    amount_inr = Column(Integer, nullable=False)          # in paise
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    # 'pending' | 'success' | 'failed' | 'refunded'
    payment_metadata = Column(Text, nullable=True, default="{}")   # JSON string
    initiated_at = Column(DateTime, default=get_utc_now)
    completed_at = Column(DateTime, nullable=True)
    failed_reason = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    plan = relationship("SubscriptionPlan", back_populates="payment_orders")
    subscription = relationship("UserSubscription", back_populates="payment_orders")

    __table_args__ = (
        Index("idx_porder_user", "user_id"),
        Index("idx_porder_status", "status"),
    )


# ---------------------------------------------------------------------------
# Access Control Settings
# ---------------------------------------------------------------------------

class AccessControlSettings(Base):
    """Global access mode toggle — only one row in this table."""
    __tablename__ = "access_control_settings"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    mode = Column(String(20), nullable=False, default="restricted")
    # 'restricted' | 'open'
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    note = Column(Text, nullable=True)

    updater = relationship("User", foreign_keys=[updated_by])


# ---------------------------------------------------------------------------
# Email Allowlist
# ---------------------------------------------------------------------------

class EmailAllowlist(Base):
    """Allowlist for restricted-mode access control."""
    __tablename__ = "email_allowlist"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(20), nullable=False, default="student")
    is_active = Column(Boolean, default=True, nullable=False)
    grant_subscription = Column(Boolean, default=False, nullable=False)
    subscription_plan_id = Column(String(36), ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    subscription_duration_override_days = Column(Integer, nullable=True)
    added_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    added_at = Column(DateTime, default=get_utc_now)
    notes = Column(Text, nullable=True)

    # Relationships
    adder = relationship("User", foreign_keys=[added_by])
    subscription_plan = relationship("SubscriptionPlan", back_populates="allowlist_entries")

    __table_args__ = (
        Index("idx_allowlist_active", "is_active"),
    )


# ---------------------------------------------------------------------------
# Subscription Audit Log
# ---------------------------------------------------------------------------

class SubscriptionAuditLog(Base):
    """Immutable audit trail for all subscription-related actions."""
    __tablename__ = "subscription_audit_log"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    performed_by = Column(String(200), nullable=True)
    old_values = Column(Text, nullable=True)   # JSON string
    new_values = Column(Text, nullable=True)   # JSON string
    note = Column(Text, nullable=True)
    performed_at = Column(DateTime, default=get_utc_now, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    subscription = relationship("UserSubscription", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_sub_audit_user_action", "user_id", "action"),
    )
