"""Core subscription service — access control logic, status computation, helpers."""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Tuple
import json
import hashlib
import hmac
import base64
import logging
import os

from models import User
from subscription_models import (
    SubscriptionPlan, UserSubscription, PaymentOrder,
    AccessControlSettings, EmailAllowlist, SubscriptionAuditLog
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Status computation — SINGLE SOURCE OF TRUTH
# ---------------------------------------------------------------------------

def compute_subscription_status(sub: UserSubscription) -> str:
    """
    Compute the effective subscription status.
    This is the ONLY place status logic lives — never check expires_at directly.
    Returns one of: 'active','trial','grace','expired','suspended','inactive'
    """
    now = datetime.utcnow()

    if sub.admin_override:
        if sub.admin_override_expires_at and now > sub.admin_override_expires_at:
            pass  # Override expired — fall through to natural status
        else:
            return "active"

    if sub.status == "suspended":
        return "suspended"

    if sub.trial_ends_at and now <= sub.trial_ends_at:
        return "trial"

    if sub.expires_at and now <= sub.expires_at:
        return "active"

    if sub.grace_ends_at and now <= sub.grace_ends_at:
        return "grace"

    if sub.expires_at and now > sub.expires_at:
        return "expired"

    return "inactive"


def days_remaining(dt: Optional[datetime]) -> Optional[int]:
    if not dt:
        return None
    delta = dt - datetime.utcnow()
    return max(0, delta.days)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_or_create_access_settings(db: Session) -> AccessControlSettings:
    settings = db.query(AccessControlSettings).first()
    if not settings:
        settings = AccessControlSettings(mode="restricted")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_active_subscription(db: Session, user_id: int) -> Optional[UserSubscription]:
    """Return the most-recently-created subscription for this user regardless of status."""
    return (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .order_by(UserSubscription.created_at.desc())
        .first()
    )


def check_allowlist(db: Session, email: str) -> bool:
    entry = (
        db.query(EmailAllowlist)
        .filter(
            EmailAllowlist.email == email.lower(),
            EmailAllowlist.is_active == True,
        )
        .first()
    )
    return entry is not None


def get_my_subscription_status_dict(db: Session, user: User) -> dict:
    """Build the full MySubscriptionStatus dict for the /my-status endpoint."""
    sub = get_active_subscription(db, user.id)

    if not sub:
        return {
            "status": "inactive",
            "plan": None,
            "started_at": None,
            "expires_at": None,
            "grace_ends_at": None,
            "days_remaining": None,
            "grace_days_remaining": None,
            "is_admin_override": False,
            "can_access_tools": False,
            "can_access_history": True,
        }

    effective = compute_subscription_status(sub)
    can_tools = effective in ("active", "trial")
    can_history = True  # always allowed

    return {
        "status": effective,
        "plan": sub.plan,
        "started_at": sub.started_at,
        "expires_at": sub.expires_at,
        "grace_ends_at": sub.grace_ends_at,
        "days_remaining": days_remaining(sub.expires_at),
        "grace_days_remaining": days_remaining(sub.grace_ends_at),
        "is_admin_override": sub.admin_override,
        "can_access_tools": can_tools,
        "can_access_history": can_history,
    }


# ---------------------------------------------------------------------------
# Subscription activation
# ---------------------------------------------------------------------------

def activate_subscription(
    db: Session,
    user: User,
    plan: SubscriptionPlan,
    payment_order: Optional[PaymentOrder] = None,
    admin_by: Optional[int] = None,
    admin_note: Optional[str] = None,
    admin_duration_days: Optional[int] = None,
    admin_override_expires_at: Optional[datetime] = None,
) -> UserSubscription:
    """Create or reactivate a UserSubscription. Idempotent for same payment order."""
    # Idempotency: if payment_order already has a subscription activated, return it
    if payment_order and payment_order.subscription_id:
        existing = db.query(UserSubscription).get(payment_order.subscription_id)
        if existing and compute_subscription_status(existing) in ("active", "trial"):
            logger.info("[SUB] Idempotent activation — subscription already active")
            return existing

    now = datetime.utcnow()
    duration_days = admin_duration_days or plan.duration_days
    is_admin = admin_by is not None

    sub = UserSubscription(
        user_id=user.id,
        plan_id=plan.id,
        status="active",
        started_at=now,
        expires_at=now + timedelta(days=duration_days),
        grace_ends_at=now + timedelta(days=duration_days + 3),
        admin_override=is_admin,
        admin_override_by=admin_by,
        admin_override_note=admin_note,
        admin_override_expires_at=admin_override_expires_at,
    )
    db.add(sub)
    db.flush()  # get sub.id

    if payment_order:
        payment_order.subscription_id = sub.id

    _audit(
        db,
        user_id=user.id,
        subscription_id=sub.id,
        action="subscription_activated",
        performed_by=f"admin:{admin_by}" if is_admin else f"user:{user.id}",
        new_values={"status": "active", "expires_at": sub.expires_at.isoformat()},
        note=admin_note or "Payment verified",
    )
    db.commit()
    db.refresh(sub)
    return sub


def extend_subscription(
    db: Session,
    sub: UserSubscription,
    add_days: int,
    admin_by: int,
    note: str,
) -> UserSubscription:
    now = datetime.utcnow()
    old_expiry = sub.expires_at or now
    sub.expires_at = old_expiry + timedelta(days=add_days)
    sub.grace_ends_at = sub.expires_at + timedelta(days=3)
    if sub.status == "expired":
        sub.status = "active"
    sub.admin_override = True
    sub.admin_override_by = admin_by
    sub.admin_override_note = note

    _audit(
        db, user_id=sub.user_id, subscription_id=sub.id,
        action="subscription_extended",
        performed_by=f"admin:{admin_by}",
        old_values={"expires_at": old_expiry.isoformat()},
        new_values={"expires_at": sub.expires_at.isoformat()},
        note=note,
    )
    db.commit()
    db.refresh(sub)
    return sub


def suspend_subscription(
    db: Session,
    sub: UserSubscription,
    admin_by: int,
    reason: str,
) -> UserSubscription:
    sub.status = "suspended"
    sub.admin_override = True
    sub.admin_override_by = admin_by
    sub.admin_override_note = reason
    _audit(
        db, user_id=sub.user_id, subscription_id=sub.id,
        action="subscription_suspended",
        performed_by=f"admin:{admin_by}",
        note=reason,
    )
    db.commit()
    db.refresh(sub)
    return sub


def remove_override(
    db: Session,
    sub: UserSubscription,
    admin_by: int,
    note: str,
) -> UserSubscription:
    sub.admin_override = False
    sub.admin_override_by = None
    sub.admin_override_note = None
    sub.admin_override_expires_at = None
    # Recompute natural status
    natural = compute_subscription_status(sub)
    sub.status = natural
    _audit(
        db, user_id=sub.user_id, subscription_id=sub.id,
        action="admin_override_removed",
        performed_by=f"admin:{admin_by}",
        note=note,
    )
    db.commit()
    db.refresh(sub)
    return sub


# ---------------------------------------------------------------------------
# Expiry checker (runs daily via scheduler)
# ---------------------------------------------------------------------------

def process_expirations(db: Session) -> Tuple[int, int]:
    """
    Move active→grace and grace→expired.
    Returns (active_to_grace_count, grace_to_expired_count). Idempotent.
    """
    now = datetime.utcnow()

    # Active → Grace
    active_to_grace = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.status == "active",
            UserSubscription.expires_at < now,
            UserSubscription.admin_override == False,
        )
        .all()
    )
    for sub in active_to_grace:
        sub.status = "grace"
        _audit(db, user_id=sub.user_id, subscription_id=sub.id,
               action="grace_period_started", performed_by="system",
               new_values={"grace_ends_at": sub.grace_ends_at.isoformat() if sub.grace_ends_at else None})

    # Grace → Expired
    grace_to_expired = (
        db.query(UserSubscription)
        .filter(
            UserSubscription.status == "grace",
            UserSubscription.grace_ends_at < now,
        )
        .all()
    )
    for sub in grace_to_expired:
        sub.status = "expired"
        _audit(db, user_id=sub.user_id, subscription_id=sub.id,
               action="subscription_expired", performed_by="system")

    db.commit()
    logger.info(
        "[EXPIRY] active→grace: %d, grace→expired: %d",
        len(active_to_grace), len(grace_to_expired)
    )
    return len(active_to_grace), len(grace_to_expired)


# ---------------------------------------------------------------------------
# Gateway signature verification
# ---------------------------------------------------------------------------

RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
APP_ENV = os.getenv("APP_ENV", "development").lower()


def _is_production_env() -> bool:
    return APP_ENV in {"production", "staging"}


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not RAZORPAY_KEY_SECRET:
        if _is_production_env():
            logger.error("[RAZORPAY] RAZORPAY_KEY_SECRET missing in %s", APP_ENV)
            return False
        logger.warning("[RAZORPAY] RAZORPAY_KEY_SECRET not set — skipping verify in dev mode")
        return True
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(), message.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_cashfree_signature(timestamp: str, data: str, signature: str) -> bool:
    if not CASHFREE_SECRET_KEY:
        if _is_production_env():
            logger.error("[CASHFREE] CASHFREE_SECRET_KEY missing in %s", APP_ENV)
            return False
        logger.warning("[CASHFREE] CASHFREE_SECRET_KEY not set — skipping verify in dev mode")
        return True
    message = f"{timestamp}{data}"
    expected = base64.b64encode(
        hmac.new(CASHFREE_SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# Audit helper
# ---------------------------------------------------------------------------

def _audit(
    db: Session,
    user_id: int,
    action: str,
    subscription_id: Optional[str] = None,
    performed_by: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    note: Optional[str] = None,
) -> None:
    log = SubscriptionAuditLog(
        user_id=user_id,
        subscription_id=subscription_id,
        action=action,
        performed_by=performed_by,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        note=note,
    )
    db.add(log)


# ---------------------------------------------------------------------------
# Seed default plans (call once on startup)
# ---------------------------------------------------------------------------

STUDENT_FEATURES = [
    "Unlimited Practice Paper Generation",
    "Mental Math Tool — unlimited sessions",
    "Burst Mode — compete and improve speed",
    "Personal leaderboard & points tracking",
    "Attendance history & calendar view",
    "Badges, streaks & rewards system",
]

TEACHER_FEATURES = [
    "Create and manage class sessions",
    "Mark & submit attendance for any batch",
    "Full student attendance oversight",
    "Practice tool access for self-improvement",
    "All student-facing features included",
    "Priority support",
]

DEFAULT_PLANS = [
    dict(plan_key="student_monthly",  role="student", duration="monthly",  duration_days=30,  display_name="1 Month",  price_inr=19900,  original_price_inr=None,   savings_pct=None, is_popular=False, features=STUDENT_FEATURES),
    dict(plan_key="student_biannual", role="student", duration="biannual", duration_days=180, display_name="6 Months", price_inr=99900,  original_price_inr=119400, savings_pct=16,   is_popular=True,  features=STUDENT_FEATURES),
    dict(plan_key="student_annual",   role="student", duration="annual",   duration_days=365, display_name="1 Year",   price_inr=179900, original_price_inr=238800, savings_pct=25,   is_popular=False, features=STUDENT_FEATURES),
    dict(plan_key="teacher_monthly",  role="teacher", duration="monthly",  duration_days=30,  display_name="1 Month",  price_inr=59900,  original_price_inr=None,   savings_pct=None, is_popular=False, features=TEACHER_FEATURES),
    dict(plan_key="teacher_biannual", role="teacher", duration="biannual", duration_days=180, display_name="6 Months", price_inr=299900, original_price_inr=359400, savings_pct=17,   is_popular=True,  features=TEACHER_FEATURES),
    dict(plan_key="teacher_annual",   role="teacher", duration="annual",   duration_days=365, display_name="1 Year",   price_inr=499900, original_price_inr=718800, savings_pct=31,   is_popular=False, features=TEACHER_FEATURES),
]


def seed_default_plans(db: Session) -> None:
    """Insert default plans if not already present. Idempotent."""
    for plan_data in DEFAULT_PLANS:
        existing = db.query(SubscriptionPlan).filter_by(plan_key=plan_data["plan_key"]).first()
        if not existing:
            features_json = json.dumps(plan_data.pop("features"))
            plan = SubscriptionPlan(**plan_data, features=features_json)
            db.add(plan)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("[SEED] Could not seed plans: %s", e)
