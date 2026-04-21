"""
Stripe billing API — subscription management
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User, SubscriptionTier, SubscriptionStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Price IDs from Stripe Dashboard (set these after creating products)
STRIPE_PRICES = {
    SubscriptionTier.CREATOR: os.getenv("STRIPE_PRICE_CREATOR", ""),
    SubscriptionTier.PRO: os.getenv("STRIPE_PRICE_PRO", ""),
    SubscriptionTier.TEAM: os.getenv("STRIPE_PRICE_TEAM", ""),
}


def get_stripe():
    """Lazy-load Stripe"""
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


class CheckoutRequest(BaseModel):
    tier: str  # "creator", "pro", or "team"


class PortalRequest(BaseModel):
    pass


@router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "tier": "free",
                "name": "Free",
                "price": 0,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "3 clips per month",
                    "Watermark on clips",
                    "720p max resolution",
                    "YouTube link import",
                ],
                "limits": {"clips_per_month": 3, "resolution": "720p", "watermark": True},
            },
            {
                "tier": "creator",
                "name": "Creator",
                "price": 1200,  # cents
                "currency": "usd",
                "interval": "month",
                "features": [
                    "50 clips per month",
                    "No watermark",
                    "1080p resolution",
                    "Auto-generated titles",
                    "YouTube link import",
                ],
                "limits": {"clips_per_month": 50, "resolution": "1080p", "watermark": False},
            },
            {
                "tier": "pro",
                "name": "Pro",
                "price": 2900,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "200 clips per month",
                    "No watermark",
                    "4K resolution",
                    "Auto-generated titles",
                    "Smart collections",
                    "Priority processing",
                    "YouTube + file upload",
                ],
                "limits": {"clips_per_month": 200, "resolution": "4k", "watermark": False},
                "popular": True,
            },
            {
                "tier": "team",
                "name": "Team",
                "price": 7900,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "500 clips per month",
                    "5 team members",
                    "No watermark",
                    "4K resolution",
                    "Auto-generated titles",
                    "Smart collections",
                    "Priority processing",
                    "Shared workspace",
                    "API access",
                ],
                "limits": {"clips_per_month": 500, "resolution": "4k", "watermark": False},
            },
        ]
    }


@router.post("/checkout")
async def create_checkout(
    req: CheckoutRequest,
    user: User = Depends(get_current_user),
):
    """Create a Stripe checkout session"""
    stripe = get_stripe()

    tier = SubscriptionTier(req.tier)
    price_id = STRIPE_PRICES.get(tier)

    if not price_id:
        raise HTTPException(status_code=400, detail=f"No price configured for {req.tier}")

    # Create or get Stripe customer
    if user.stripe_customer_id:
        customer_id = user.stripe_customer_id
    else:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name or "",
            metadata={"user_id": user.id},
        )
        customer_id = customer.id
        user.stripe_customer_id = customer_id
        db = next(get_db())
        db.merge(user)
        db.commit()

    # Create checkout session
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/settings?billing=success",
        cancel_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/settings?billing=cancelled",
        metadata={"user_id": user.id, "tier": req.tier},
    )

    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/portal")
async def create_portal(user: User = Depends(get_current_user)):
    """Create a Stripe customer portal session for managing subscription"""
    stripe = get_stripe()

    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No subscription to manage")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/settings",
    )

    return {"portal_url": session.url}


@router.get("/status")
async def get_billing_status(user: User = Depends(get_current_user)):
    """Get current billing status"""
    return {
        "tier": user.tier.value,
        "status": user.subscription_status.value,
        "clips_used": user.clips_used_this_month,
        "clip_limit": user.clip_limit,
        "clips_remaining": max(0, user.clip_limit - user.clips_used_this_month),
        "max_resolution": user.max_resolution,
        "has_watermark": user.has_watermark,
        "stripe_customer_id": user.stripe_customer_id or None,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    stripe = get_stripe()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        tier = session["metadata"].get("tier")

        if user_id and tier:
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.stripe_customer_id = session.get("customer", "")
                user.stripe_subscription_id = session.get("subscription", "")
                user.tier = SubscriptionTier(tier)
                user.subscription_status = SubscriptionStatus.ACTIVE
                db.merge(user)
                db.commit()
                logger.info(f"User {user_id} upgraded to {tier}")

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]

        db = next(get_db())
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            status = subscription["status"]
            if status == "active":
                user.subscription_status = SubscriptionStatus.ACTIVE
            elif status == "past_due":
                user.subscription_status = SubscriptionStatus.PAST_DUE
            elif status == "canceled":
                user.subscription_status = SubscriptionStatus.CANCELLED
                user.tier = SubscriptionTier.FREE
            db.merge(user)
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]

        db = next(get_db())
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.tier = SubscriptionTier.FREE
            user.subscription_status = SubscriptionStatus.CANCELLED
            db.merge(user)
            db.commit()
            logger.info(f"User {user.id} downgraded to free")

    return {"status": "ok"}
