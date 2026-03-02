"""Payment webhook endpoints — source of truth for payment events."""
from fastapi import APIRouter, Request, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi import Depends
from typing import Optional
from datetime import datetime
import json
import hashlib
import hmac as hmac_lib
import logging
import os

from models import User, get_db
from subscription_models import PaymentOrder, SubscriptionPlan
from subscription_service import activate_subscription, _audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
CASHFREE_WEBHOOK_SECRET = os.getenv("CASHFREE_SECRET_KEY", "")


# ---------------------------------------------------------------------------
# POST /api/payments/webhook/razorpay
# Validates header X-Razorpay-Signature then processes event
# ---------------------------------------------------------------------------

@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()

    # Validate webhook signature
    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac_lib.new(
            RAZORPAY_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not x_razorpay_signature or not hmac_lib.compare_digest(expected, x_razorpay_signature):
            logger.warning("[WEBHOOK/RZP] Invalid signature")
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    else:
        logger.warning("[WEBHOOK/RZP] RAZORPAY_WEBHOOK_SECRET not set — skipping verify in dev")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    logger.info("[WEBHOOK/RZP] event=%s", event)

    if event == "payment.captured":
        _process_razorpay_success(db, entity)
    elif event == "payment.failed":
        _process_razorpay_failed(db, entity)
    elif event == "refund.processed":
        _process_razorpay_refund(db, entity)

    return {"status": "ok"}


def _process_razorpay_success(db: Session, entity: dict) -> None:
    gateway_order_id = entity.get("order_id", "")
    payment_id = entity.get("id", "")

    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_order_id == gateway_order_id
    ).first()
    if not order:
        logger.warning("[WEBHOOK/RZP] Order not found: %s", gateway_order_id)
        return

    # Idempotency
    if order.status == "success":
        logger.info("[WEBHOOK/RZP] Already processed: %s", gateway_order_id)
        return

    order.status = "success"
    order.gateway_payment_id = payment_id
    order.completed_at = datetime.utcnow()
    order.payment_metadata = json.dumps(entity)
    db.commit()

    # Activate subscription
    user = db.query(User).get(order.user_id)
    plan = db.query(SubscriptionPlan).get(order.plan_id)
    if user and plan:
        activate_subscription(db, user, plan, payment_order=order)
        logger.info("[WEBHOOK/RZP] Subscription activated for user %d", user.id)


def _process_razorpay_failed(db: Session, entity: dict) -> None:
    gateway_order_id = entity.get("order_id", "")
    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_order_id == gateway_order_id
    ).first()
    if order and order.status == "pending":
        order.status = "failed"
        order.failed_reason = entity.get("error_description", "Payment failed")
        db.commit()
        logger.info("[WEBHOOK/RZP] Payment failed: %s", gateway_order_id)


def _process_razorpay_refund(db: Session, entity: dict) -> None:
    payment_id = entity.get("payment_id", "")
    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_payment_id == payment_id
    ).first()
    if order:
        order.status = "refunded"
        db.commit()
        logger.info("[WEBHOOK/RZP] Refund processed: %s", payment_id)


# ---------------------------------------------------------------------------
# POST /api/payments/webhook/cashfree
# Validates timestamp + signature then processes event
# ---------------------------------------------------------------------------

@router.post("/webhook/cashfree")
async def cashfree_webhook(
    request: Request,
    x_webhook_timestamp: Optional[str] = Header(None),
    x_webhook_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()

    if CASHFREE_WEBHOOK_SECRET and x_webhook_timestamp and x_webhook_signature:
        import base64
        message = f"{x_webhook_timestamp}{raw_body.decode()}"
        expected = base64.b64encode(
            hmac_lib.new(
                CASHFREE_WEBHOOK_SECRET.encode(),
                message.encode(),
                hashlib.sha256,
            ).digest()
        ).decode()
        if not hmac_lib.compare_digest(expected, x_webhook_signature):
            logger.warning("[WEBHOOK/CF] Invalid signature")
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    else:
        logger.warning("[WEBHOOK/CF] Skipping signature verify (missing secret or headers)")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    logger.info("[WEBHOOK/CF] event=%s", event_type)

    if event_type == "PAYMENT_SUCCESS_WEBHOOK":
        _process_cashfree_success(db, data)
    elif event_type == "PAYMENT_FAILED_WEBHOOK":
        _process_cashfree_failed(db, data)

    return {"status": "ok"}


def _process_cashfree_success(db: Session, data: dict) -> None:
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})
    gateway_order_id = order_data.get("order_id", "")
    payment_id = payment_data.get("cf_payment_id", "")

    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_order_id == gateway_order_id
    ).first()
    if not order:
        logger.warning("[WEBHOOK/CF] Order not found: %s", gateway_order_id)
        return

    if order.status == "success":
        return  # Idempotent

    order.status = "success"
    order.gateway_payment_id = str(payment_id)
    order.completed_at = datetime.utcnow()
    order.payment_metadata = json.dumps(data)
    db.commit()

    user = db.query(User).get(order.user_id)
    plan = db.query(SubscriptionPlan).get(order.plan_id)
    if user and plan:
        activate_subscription(db, user, plan, payment_order=order)
        logger.info("[WEBHOOK/CF] Subscription activated for user %d", user.id)


def _process_cashfree_failed(db: Session, data: dict) -> None:
    order_data = data.get("order", {})
    gateway_order_id = order_data.get("order_id", "")
    order = db.query(PaymentOrder).filter(
        PaymentOrder.gateway_order_id == gateway_order_id
    ).first()
    if order and order.status == "pending":
        order.status = "failed"
        order.failed_reason = data.get("payment", {}).get("payment_message", "Payment failed")
        db.commit()
