"""User-facing subscription routes: plans, status, initiate & verify payment."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import update as sa_update
from typing import List, Optional
from datetime import datetime
import uuid
import os
import logging

from models import User, get_db
from auth import get_current_user
from subscription_models import SubscriptionPlan, PaymentOrder
from subscription_schemas import (
    SubscriptionPlanOut, MySubscriptionStatusOut,
    InitiatePaymentIn, PaymentInitiationOut,
    VerifyPaymentIn, SubscriptionActivationOut,
)
from subscription_service import (
    get_or_create_access_settings, check_allowlist,
    get_active_subscription, compute_subscription_status,
    get_my_subscription_status_dict, activate_subscription,
    verify_razorpay_signature, verify_cashfree_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")

# ---------------------------------------------------------------------------
# GET /api/subscriptions/plans?role=student
# Public — no auth required
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=List[SubscriptionPlanOut])
def list_plans(
    role: Optional[str] = Query(None, description="Filter by 'student' or 'teacher'"),
    db: Session = Depends(get_db),
):
    q = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True)
    if role in ("student", "teacher"):
        q = q.filter(SubscriptionPlan.role == role)
    plans = q.order_by(SubscriptionPlan.duration_days).all()
    return plans


# ---------------------------------------------------------------------------
# GET /api/subscriptions/my-status
# Authenticated
# ---------------------------------------------------------------------------

@router.get("/my-status", response_model=MySubscriptionStatusOut)
def my_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = get_my_subscription_status_dict(db, current_user)
    return data


# ---------------------------------------------------------------------------
# POST /api/subscriptions/initiate
# Authenticated — creates a PaymentOrder and returns gateway params
# ---------------------------------------------------------------------------

@router.post("/initiate", response_model=PaymentInitiationOut)
def initiate_payment(
    body: InitiatePaymentIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Resolve plan
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == body.plan_id,
        SubscriptionPlan.is_active == True,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found or inactive.")

    gateway = body.gateway

    # Create internal order record
    internal_id = str(uuid.uuid4())
    gateway_order_id: str

    if gateway == "razorpay":
        # In production, call Razorpay API here:
        # import razorpay; client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))
        # rp_order = client.order.create({"amount": plan.price_inr, "currency": "INR", "receipt": internal_id})
        # gateway_order_id = rp_order["id"]
        gateway_order_id = f"order_razorpay_{internal_id.replace('-','')[:16]}"  # placeholder
    else:  # cashfree
        # In production, call Cashfree API:
        # POST https://api.cashfree.com/pg/orders
        gateway_order_id = f"cf_{internal_id.replace('-','')[:16]}"  # placeholder

    order = PaymentOrder(
        id=internal_id,
        user_id=current_user.id,
        plan_id=plan.id,
        gateway=gateway,
        gateway_order_id=gateway_order_id,
        amount_inr=plan.price_inr,
        currency="INR",
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    gateway_key = RAZORPAY_KEY_ID if gateway == "razorpay" else CASHFREE_APP_ID

    return PaymentInitiationOut(
        order_id=internal_id,
        gateway_order_id=gateway_order_id,
        amount=plan.price_inr,
        currency="INR",
        gateway=gateway,
        gateway_key=gateway_key,
        user_name=current_user.name or "",
        user_email=current_user.email or "",
        plan_name=plan.display_name,
    )


# ---------------------------------------------------------------------------
# POST /api/subscriptions/verify
# Authenticated — verifies gateway signature, activates subscription
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=SubscriptionActivationOut)
def verify_payment(
    body: VerifyPaymentIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find the pending order
    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_order_id == body.gateway_order_id,
        PaymentOrder.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found.")

    # Idempotency: already completed
    if order.status == "success" and order.subscription_id:
        sub = get_active_subscription(db, current_user.id)
        return SubscriptionActivationOut(
            success=True,
            message="Subscription already active.",
            status="active",
            expires_at=sub.expires_at if sub else None,
        )

    # CRITICAL: Verify signature server-side
    if body.gateway == "razorpay":
        valid = verify_razorpay_signature(
            body.gateway_order_id, body.gateway_payment_id, body.gateway_signature
        )
    else:
        # Cashfree: signature is over "timestamp.data"
        # body.gateway_signature = "<timestamp>.<signature>" convention from frontend
        parts = body.gateway_signature.split(".", 1)
        if len(parts) == 2:
            valid = verify_cashfree_signature(parts[0], body.gateway_payment_id, parts[1])
        else:
            valid = False

    if not valid:
        logger.warning("[VERIFY] Invalid signature for order %s user %d", order.id, current_user.id)
        order.status = "failed"
        order.failed_reason = "Signature verification failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed. Invalid signature.")

    # Atomically claim the order — only succeeds if status is still 'pending'.
    # This prevents a second concurrent request from activating the same order twice.
    rows_updated = db.execute(
        sa_update(PaymentOrder)
        .where(PaymentOrder.id == order.id, PaymentOrder.status == "pending")
        .values(
            status="success",
            gateway_payment_id=body.gateway_payment_id,
            gateway_signature=body.gateway_signature,
            completed_at=datetime.utcnow(),
        )
    ).rowcount
    db.commit()

    if rows_updated == 0:
        # Another request already processed this order — return the existing subscription.
        sub = get_active_subscription(db, current_user.id)
        return SubscriptionActivationOut(
            success=True,
            message="Subscription already active.",
            status="active",
            expires_at=sub.expires_at if sub else None,
        )

    # Reload the order after atomic update
    db.refresh(order)

    # Resolve plan
    plan = db.query(SubscriptionPlan).get(order.plan_id)
    if not plan:
        raise HTTPException(status_code=500, detail="Plan not found.")

    # Activate subscription
    sub = activate_subscription(db, current_user, plan, payment_order=order)

    return SubscriptionActivationOut(
        success=True,
        message="Subscription activated successfully!",
        status="active",
        expires_at=sub.expires_at,
    )
