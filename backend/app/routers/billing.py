import stripe
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.services.billing_service import create_checkout_session, cancel_subscription, get_subscription
from app.utils.dependencies import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/create-checkout")
def create_checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    url = create_checkout_session(tenant.id, tenant.email)
    return {"checkout_url": url}


@router.get("/status")
def billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    subscription = None
    if tenant.stripe_subscription_id:
        subscription = get_subscription(tenant.stripe_subscription_id)
    return {
        "is_subscribed": tenant.is_subscribed,
        "subscription_status": tenant.subscription_status,
        "stripe_subscription_id": tenant.stripe_subscription_id,
        "current_period_end": subscription.get("current_period_end") if subscription else None,
    }


@router.post("/cancel")
def cancel_billing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant or not tenant.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    success = cancel_subscription(tenant.stripe_subscription_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")
    tenant.is_subscribed = False
    tenant.subscription_status = "canceled"
    db.commit()
    return {"message": "Subscription cancelled"}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.exception("Webhook parse error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event["type"]
    event_id = event["id"]
    obj = json.loads(str(event["data"]["object"]))
    logger.info("Stripe webhook received: %s (%s)", event_type, event_id)

    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata") or {}
        tenant_id = metadata.get("tenant_id")
        if not tenant_id:
            logger.error("checkout.session.completed missing tenant_id — event %s", event_id)
            return {"status": "ok"}

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            logger.error("checkout.session.completed — tenant %s not found", tenant_id)
            return {"status": "ok"}

        if tenant.is_subscribed and tenant.stripe_subscription_id == obj.get("subscription"):
            logger.info("Already processed for tenant %s, skipping", tenant_id)
            return {"status": "ok"}

        tenant.stripe_customer_id = obj.get("customer")
        tenant.stripe_subscription_id = obj.get("subscription")
        tenant.is_subscribed = True
        tenant.subscription_status = "active"
        db.commit()
        logger.info("Tenant %s activated via checkout", tenant_id)

    elif event_type == "customer.subscription.updated":
        stripe_status = obj.get("status")
        tenant = db.query(Tenant).filter(
            Tenant.stripe_subscription_id == obj.get("id")
        ).first()
        if not tenant:
            logger.warning("subscription.updated — no tenant for sub %s", obj.get("id"))
            return {"status": "ok"}

        tenant.subscription_status = stripe_status
        tenant.is_subscribed = stripe_status in ("active", "trialing")
        db.commit()
        logger.info("Tenant %s subscription updated to %s", tenant.id, stripe_status)

    elif event_type == "invoice.payment_failed":
        customer_id = obj.get("customer")
        tenant = db.query(Tenant).filter(
            Tenant.stripe_customer_id == customer_id
        ).first()
        if not tenant:
            logger.warning("invoice.payment_failed — no tenant for customer %s", customer_id)
            return {"status": "ok"}

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
            return {"status": "ok"}

        tenant.is_subscribed = False
        tenant.subscription_status = "canceled"
        db.commit()
        logger.info("Tenant %s subscription deleted", tenant.id)

    else:
        logger.debug("Unhandled Stripe event: %s", event_type)

    return {"status": "ok"}