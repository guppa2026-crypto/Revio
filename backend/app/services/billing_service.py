import stripe
import logging
from app.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_IDS = {
    "starter": settings.STRIPE_STARTER_PRICE_ID,
    "pro": settings.STRIPE_PRO_PRICE_ID,
}


def create_checkout_session(tenant_id: str, tenant_email: str, plan: str, customer_id: str | None = None) -> str:
    price_id = PLAN_PRICE_IDS.get(plan)
    if not price_id:
        raise ValueError(f"Unknown plan: {plan!r}")
    # Reuse the existing Stripe customer so a returning subscriber doesn't get a duplicate
    customer_args = {"customer": customer_id} if customer_id else {"customer_email": tenant_email}
    session = stripe.checkout.Session.create(
        **customer_args,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/billing?subscription=success",
        cancel_url=f"{settings.FRONTEND_URL}/billing?subscription=cancelled",
        metadata={"tenant_id": str(tenant_id), "plan": plan},
    )
    return session.url


def upgrade_subscription(stripe_subscription_id: str) -> bool:
    try:
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        item_id = sub["items"]["data"][0]["id"]
        stripe.Subscription.modify(
            stripe_subscription_id,
            items=[{"id": item_id, "price": settings.STRIPE_PRO_PRICE_ID}],
            proration_behavior="always_invoice",
        )
        return True
    except Exception as e:
        logger.exception("Failed to upgrade subscription: %s", e)
        return False


def cancel_subscription(stripe_subscription_id: str) -> dict | None:
    """Schedule cancellation at the end of the current period. Returns the subscription."""
    try:
        sub = stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=True)
        return sub.to_dict()
    except Exception as e:
        logger.exception("Failed to cancel subscription: %s", e)
        return None


def create_portal_session(stripe_customer_id: str, return_url: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def get_subscription(stripe_subscription_id: str) -> dict | None:
    try:
        # to_dict(): StripeObject has no .get() in current stripe-python
        return stripe.Subscription.retrieve(stripe_subscription_id).to_dict()
    except Exception as e:
        logger.exception("Failed to get subscription: %s", e)
        return None
