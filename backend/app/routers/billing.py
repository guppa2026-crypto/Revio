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
        "stripe_subscription_id": tenant.stripe_subscription_id,
        "subscription_status": subscription.get("status") if subscription else None,
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        tenant_id = session["metadata"].get("tenant_id")
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant:
            tenant.stripe_customer_id = session.get("customer")
            tenant.stripe_subscription_id = session.get("subscription")
            tenant.is_subscribed = True
            db.commit()
            logger.info("Tenant %s subscribed", tenant_id)

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        tenant = db.query(Tenant).filter(
            Tenant.stripe_subscription_id == sub["id"]
        ).first()
        if tenant:
            tenant.is_subscribed = False
            db.commit()
            logger.info("Tenant %s unsubscribed", tenant.id)

    return {"status": "ok"}# force redeploy
# redeploy
