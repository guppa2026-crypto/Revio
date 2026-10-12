import json
import math
import stripe
import logging
import redis
from uuid import UUID as PyUUID
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.services.billing_service import (
    create_checkout_session,
    cancel_subscription,
    get_subscription,
    create_portal_session,
    upgrade_subscription,
)
from app.utils.dependencies import get_current_user
from app.utils.plan_limits import get_reply_limit, get_replies_used, trial_ends_at, within_trial_window
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)


def _mark_event_processed(event_id: str) -> bool:
    """
    Returns True if this event is new (should be processed).
    Returns False if already processed (duplicate — skip it).
    Fails open: if Redis is unavailable, always returns True to avoid blocking payments.
    """
    try:
        key = f"stripe_evt:{event_id}"
        is_new = _redis.set(key, "1", nx=True, ex=604800)  # 7-day TTL
        return is_new is not None
    except Exception:
        logger.warning("Redis unavailable for webhook dedup — processing event %s anyway", event_id)
        return True


def _unmark_event(event_id: str) -> None:
    """Forget an event whose handling failed, so Stripe's retry is processed rather than skipped."""
    try:
        _redis.delete(f"stripe_evt:{event_id}")
    except Exception:
        logger.warning("Redis unavailable — could not release webhook event %s for retry", event_id)


class CheckoutRequest(BaseModel):
    plan: Literal["starter", "pro"]


@router.post("/create-checkout")
def create_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.is_subscribed:
        raise HTTPException(status_code=400, detail="Already subscribed. Use the upgrade or portal endpoint.")
    if tenant.subscription_status in ("past_due", "unpaid", "incomplete") and tenant.stripe_subscription_id:
        # The old subscription still exists in Stripe — a new checkout would bill twice
        raise HTTPException(
            status_code=409,
            detail="Your last payment failed. Please update your payment method in the billing portal.",
        )
    url = create_checkout_session(tenant.id, tenant.email, body.plan, customer_id=tenant.stripe_customer_id)
    return {"checkout_url": url}


@router.post("/upgrade")
def upgrade_to_pro(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription to upgrade")
    if tenant.plan == "pro":
        raise HTTPException(status_code=400, detail="Already on Pro plan")
    if not settings.STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=500, detail="Pro price not configured")
    success = upgrade_subscription(tenant.stripe_subscription_id)
    if not success:
        raise HTTPException(status_code=500, detail="Upgrade failed. Please try again.")
    tenant.plan = "pro"
    db.commit()
    return {"message": "Upgraded to Pro"}


def _current_period_end(subscription: dict | None) -> int | None:
    """Period end as a unix timestamp. Newer Stripe API versions put it on the items."""
    if not subscription:
        return None
    if subscription.get("current_period_end"):
        return subscription["current_period_end"]
    items = (subscription.get("items") or {}).get("data") or []
    return items[0].get("current_period_end") if items else None


@router.get("/status")
def billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    subscription = None
    if tenant.stripe_subscription_id:
        subscription = get_subscription(tenant.stripe_subscription_id)

    seconds_left = (trial_ends_at(tenant) - datetime.now(timezone.utc)).total_seconds()
    trial_days_remaining = math.ceil(seconds_left / 86400) if seconds_left > 0 else 0
    is_trial = not tenant.is_subscribed and within_trial_window(tenant)

    limit = get_reply_limit(tenant)
    all_time = not tenant.is_subscribed
    replies_used = get_replies_used(tenant.id, db, all_time=all_time) if limit is not None else 0

    return {
        "is_subscribed": tenant.is_subscribed,
        "subscription_status": tenant.subscription_status,
        "current_period_end": _current_period_end(subscription),
        "cancel_at_period_end": bool(subscription and subscription.get("cancel_at_period_end")),
        "is_trial": is_trial,
        "trial_days_remaining": trial_days_remaining,
        "plan": tenant.plan,
        "ai_replies_used": replies_used,
        "ai_replies_limit": limit,
    }


@router.post("/portal")
def billing_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Please subscribe first.")
    url = create_portal_session(tenant.stripe_customer_id, f"{settings.FRONTEND_URL}/billing")
    return {"portal_url": url}


@router.post("/cancel")
def cancel_billing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    # Per the Terms, cancellation takes effect at the end of the paid period. Access stays
    # on until Stripe sends customer.subscription.deleted at that point.
    subscription = cancel_subscription(tenant.stripe_subscription_id)
    if subscription is None:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")
    return {
        "message": "Your subscription will end at the end of the current billing period.",
        "current_period_end": _current_period_end(subscription),
    }


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    # The handling below does blocking DB work — keep it off the event loop
    return await run_in_threadpool(_process_webhook, payload, sig_header, db)


def _process_webhook(payload: bytes, sig_header: str | None, db: Session) -> dict:
    try:
        stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        # Work on the verified payload as plain JSON: the SDK's StripeObject is not a dict
        # in current stripe-python, so `.get()` on the event object raises AttributeError
        event = json.loads(payload)
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception:
        logger.exception("Webhook parse error")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    event_type = event["type"]
    event_id = event["id"]
    obj = event["data"]["object"]
    logger.info("Stripe webhook received: %s (%s)", event_type, event_id)

    if not _mark_event_processed(event_id):
        logger.info("Stripe event %s already processed — skipping", event_id)
        return {"status": "ok"}

    try:
        _handle_event(event_type, event_id, obj, db)
    except Exception:
        # Release the dedup key so Stripe's automatic retry gets processed
        db.rollback()
        _unmark_event(event_id)
        logger.exception("Failed to handle Stripe event %s (%s) — Stripe will retry", event_id, event_type)
        raise HTTPException(status_code=500, detail="Webhook handling failed")

    return {"status": "ok"}


def _handle_event(event_type: str, event_id: str, obj: dict, db: Session) -> None:
    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata") or {}
        tenant_id_str = metadata.get("tenant_id")
        if not tenant_id_str:
            logger.error("checkout.session.completed missing tenant_id — event %s", event_id)
            return
        try:
            tenant_id = PyUUID(tenant_id_str)
        except (ValueError, TypeError):
            logger.error("checkout.session.completed invalid tenant_id %r — event %s", tenant_id_str, event_id)
            return

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            logger.error("checkout.session.completed — tenant %s not found", tenant_id)
            return

        tenant.stripe_customer_id = obj.get("customer")
        tenant.stripe_subscription_id = obj.get("subscription")
        tenant.is_subscribed = True
        tenant.subscription_status = "active"
        tenant.plan = metadata.get("plan") or "pro"
        db.commit()
        logger.info("Tenant %s activated on %s plan via checkout", tenant_id, tenant.plan)

    elif event_type == "customer.subscription.updated":
        stripe_status = obj.get("status")
        tenant = db.query(Tenant).filter(
            Tenant.stripe_subscription_id == obj.get("id")
        ).first()
        if not tenant:
            logger.warning("subscription.updated — no tenant for sub %s", obj.get("id"))
            return

        tenant.subscription_status = stripe_status
        tenant.is_subscribed = stripe_status in ("active", "trialing")

        # Keep plan in sync if changed via portal
        items = obj.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
            if price_id == settings.STRIPE_STARTER_PRICE_ID:
                tenant.plan = "starter"
            elif price_id == settings.STRIPE_PRO_PRICE_ID:
                tenant.plan = "pro"

        db.commit()
        logger.info("Tenant %s subscription updated to %s", tenant.id, stripe_status)

    elif event_type == "invoice.payment_failed":
        customer_id = obj.get("customer")
        tenant = db.query(Tenant).filter(
            Tenant.stripe_customer_id == customer_id
        ).first()
        if not tenant:
            logger.warning("invoice.payment_failed — no tenant for customer %s", customer_id)
            return

        tenant.subscription_status = "past_due"
        tenant.is_subscribed = False
        db.commit()
        logger.info("Tenant %s payment failed — marked past_due", tenant.id)

    elif event_type == "customer.subscription.deleted":
        tenant = db.query(Tenant).filter(
            Tenant.stripe_subscription_id == obj.get("id")
        ).first()
        if not tenant:
            logger.warning("subscription.deleted — no tenant for sub %s", obj.get("id"))
            return

        tenant.is_subscribed = False
        tenant.subscription_status = "canceled"
        db.commit()
        logger.info("Tenant %s subscription deleted", tenant.id)

    else:
        logger.debug("Unhandled Stripe event: %s", event_type)
