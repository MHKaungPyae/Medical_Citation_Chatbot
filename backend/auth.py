"""Supabase JWT verification for FastAPI.

Verifies JWTs locally using PyJWT — no network call to Supabase.
"""

import logging
from typing import Optional

from fastapi import Header, HTTPException, status
from jwt import ExpiredSignatureError, InvalidTokenError, decode as jwt_decode

from backend.config import SUPABASE_JWT_SECRET

logger = logging.getLogger(__name__)


def _get_jwt_secret() -> str:
    """Return the Supabase JWT secret."""
    if not SUPABASE_JWT_SECRET:
        raise RuntimeError("Missing SUPABASE_JWT_SECRET environment variable.")
    return SUPABASE_JWT_SECRET


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Verify Supabase JWT locally and return user info.

    Returns dict with 'id' and 'email' keys.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format.",
        )

    token = authorization[7:]
    jwt_secret = _get_jwt_secret()

    try:
        payload = jwt_decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except (InvalidTokenError, ExpiredSignatureError) as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user_id = payload.get("sub")
    email = payload.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID.",
        )

    return {"id": user_id, "email": email}
