import stripe
import logging
from app.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session(tenant_id: str, tenant_email: str) -> str:
    session = stripe.checkout.Session.create(
        customer_email=tenant_email,
        payment_method_types=["card"],
        line_items=[{
            "price": settings.STRIPE_PRICE_ID,
            "quantity": 1,
        }],
        mode="subscription",
        success_url="https://reviodigital.uk/dashboard?subscription=success",
        cancel_url="https://reviodigital.uk/billing?subscription=cancelled",
        metadata={"tenant_id": str(tenant_id)},
    )
    return session.url

def cancel_subscription(stripe_subscription_id: str) -> bool:
    try:
        stripe.Subscription.cancel(stripe_subscription_id)
        return True
    except Exception as e:
        logger.exception("Failed to cancel subscription: %s", e)
        return False

def get_subscription(stripe_subscription_id: str):
    try:
        return stripe.Subscription.retrieve(stripe_subscription_id)
    except Exception as e:
        logger.exception("Failed to get subscription: %s", e)
        return None
