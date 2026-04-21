"""
Authentication middleware — Clerk JWT verification
"""
import os
import logging
from typing import Optional
from datetime import datetime

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests

from .database import get_db
from ..models.user import User, SubscriptionTier, SubscriptionStatus

logger = logging.getLogger(__name__)

# Clerk JWT verification
security = HTTPBearer(auto_error=False)

CLERK_JWT_ISSUER = os.getenv("CLERK_JWT_ISSUER", "")
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")

# Cache JWKS keys
_jwks_cache = None
_jwks_cache_time = 0


def get_jwks():
    """Fetch and cache Clerk JWKS"""
    global _jwks_cache, _jwks_cache_time
    import time

    if _jwks_cache and (time.time() - _jwks_cache_time) < 3600:
        return _jwks_cache

    if not CLERK_JWKS_URL:
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")

    resp = requests.get(CLERK_JWKS_URL, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cache_time = time.time()
    return _jwks_cache


def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk JWT token and return claims"""
    try:
        # Get the key ID from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token: no key ID")

        # Find matching key in JWKS
        jwks = get_jwks()
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwk
                break

        if not key:
            raise HTTPException(status_code=401, detail="Invalid token: key not found")

        # Verify and decode
        from jose.utils import base64url_decode
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend
        import json

        # Construct RSA public key from JWK
        n = int.from_bytes(base64url_decode(key["n"]), "big")
        e = int.from_bytes(base64url_decode(key["e"]), "big")
        public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())

        payload = jwt.decode(
            token,
            public_key,
            algorithms=[key.get("alg", "RS256")],
            issuer=CLERK_JWT_ISSUER,
            options={"verify_exp": True, "verify_iss": True},
        )

        return payload

    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db=Depends(get_db),
) -> User:
    """Get current authenticated user from Clerk JWT"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify token
    claims = verify_clerk_token(credentials.credentials)
    clerk_user_id = claims.get("sub", "")

    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")

    # Find or create user
    user = db.query(User).filter(User.id == clerk_user_id).first()

    if not user:
        # Extract info from Clerk claims
        email = claims.get("email", "")
        name = claims.get("name", claims.get("first_name", ""))

        user = User(
            id=clerk_user_id,
            email=email,
            name=name,
            tier=SubscriptionTier.FREE,
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"New user created: {clerk_user_id} ({email})")

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db=Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_tier(min_tier: SubscriptionTier):
    """Dependency that requires a minimum subscription tier"""
    tier_order = {
        SubscriptionTier.FREE: 0,
        SubscriptionTier.CREATOR: 1,
        SubscriptionTier.PRO: 2,
        SubscriptionTier.TEAM: 3,
    }

    async def check_tier(user: User = Depends(get_current_user)) -> User:
        if tier_order.get(user.tier, 0) < tier_order.get(min_tier, 0):
            raise HTTPException(
                status_code=403,
                detail=f"This feature requires {min_tier.value} plan or higher"
            )
        return user

    return check_tier
