"""Pydantic v2 schemas for subscription, payment, and access control."""
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Literal, Any
from datetime import datetime
import json


# ---------------------------------------------------------------------------
# Subscription Plan schemas
# ---------------------------------------------------------------------------

class SubscriptionPlanOut(BaseModel):
    id: str
    plan_key: str
    role: str
    duration: str
    duration_days: int
    display_name: str
    price_inr: int          # paise
    original_price_inr: Optional[int] = None
    savings_pct: Optional[int] = None
    is_popular: bool
    is_active: bool
    features: List[str]

    @field_validator("features", mode="before")
    @classmethod
    def parse_features(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Subscription status schemas
# ---------------------------------------------------------------------------

class MySubscriptionStatusOut(BaseModel):
    status: str
    plan: Optional[SubscriptionPlanOut] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    grace_ends_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    grace_days_remaining: Optional[int] = None
    is_admin_override: bool = False
    can_access_tools: bool = False
    can_access_history: bool = True


# ---------------------------------------------------------------------------
# Payment schemas
# ---------------------------------------------------------------------------

class InitiatePaymentIn(BaseModel):
    plan_id: str
    gateway: Literal["razorpay", "cashfree"]


class PaymentInitiationOut(BaseModel):
    order_id: str              # internal UUID
    gateway_order_id: str      # gateway's order ID
    amount: int                # paise
    currency: str
    gateway: str
    gateway_key: str           # publishable key
    user_name: str
    user_email: str
    plan_name: str


class VerifyPaymentIn(BaseModel):
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str
    gateway: Literal["razorpay", "cashfree"]


class SubscriptionActivationOut(BaseModel):
    success: bool
    message: str
    status: Optional[str] = None
    expires_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Admin access control schemas
# ---------------------------------------------------------------------------

class AccessControlSettingsOut(BaseModel):
    id: str
    mode: str
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    note: Optional[str] = None

    model_config = {"from_attributes": True}


class AccessControlSettingsUpdateIn(BaseModel):
    mode: Literal["restricted", "open"]
    note: str

    @field_validator("note")
    @classmethod
    def note_min_len(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Note must be at least 5 characters.")
        return v.strip()


# Allowlist schemas
class AllowlistEntryIn(BaseModel):
    email: str
    role: Literal["student", "teacher"] = "student"
    grant_subscription: bool = False
    subscription_plan_id: Optional[str] = None
    subscription_duration_override_days: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.strip().lower()


class AllowlistEntryUpdateIn(BaseModel):
    role: Optional[Literal["student", "teacher"]] = None
    is_active: Optional[bool] = None
    grant_subscription: Optional[bool] = None
    subscription_plan_id: Optional[str] = None
    subscription_duration_override_days: Optional[int] = None
    notes: Optional[str] = None


class AllowlistEntryOut(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    grant_subscription: bool
    subscription_plan_id: Optional[str] = None
    notes: Optional[str] = None
    added_at: datetime
    sync_status: str = "pending"   # 'synced' | 'pending' | 'not_in_list'
    last_login_at: Optional[datetime] = None
    user_name: Optional[str] = None
    subscription_status: Optional[str] = None

    model_config = {"from_attributes": True}


class BulkImportIn(BaseModel):
    entries: List[AllowlistEntryIn]


class BulkImportResultOut(BaseModel):
    added: int
    skipped: int
    errors: List[str]


# Sync report
class SyncReportOut(BaseModel):
    total_allowed_emails: int
    synced: int
    pending: int
    users_not_in_list: int
    access_mode: str


# Subscription override
class SubscriptionOverrideIn(BaseModel):
    action: Literal["activate", "extend", "suspend", "remove_override"]
    plan_id: Optional[str] = None
    duration_days: Optional[int] = None
    note: str
    override_expires_at: Optional[datetime] = None

    @field_validator("note")
    @classmethod
    def note_min_len(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Note must be at least 10 characters for audit trail.")
        return v.strip()


class UserSubscriptionOut(BaseModel):
    id: str
    user_id: int
    plan_id: str
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    grace_ends_at: Optional[datetime] = None
    admin_override: bool
    admin_override_note: Optional[str] = None
    admin_override_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    plan: Optional[SubscriptionPlanOut] = None

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: str
    user_id: int
    subscription_id: Optional[str] = None
    action: str
    performed_by: Optional[str] = None
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    note: Optional[str] = None
    performed_at: datetime

    @field_validator("old_values", "new_values", mode="before")
    @classmethod
    def parse_json_field(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

    model_config = {"from_attributes": True}


class PaginatedAllowlistOut(BaseModel):
    items: List[AllowlistEntryOut]
    total: int
    page: int
    limit: int
    pages: int
