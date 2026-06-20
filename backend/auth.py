"""Supabase JWT verification for FastAPI."""

import os
import logging
from typing import Optional

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

_SUPABASE_JWT_SECRET: Optional[str] = None


def _get_jwt_secret() -> str:
    global _SUPABASE_JWT_SECRET
    if _SUPABASE_JWT_SECRET is None:
        _SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
        if not _SUPABASE_JWT_SECRET:
            raise RuntimeError("Missing SUPABASE_JWT_SECRET environment variable.")
    return _SUPABASE_JWT_SECRET


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Verify Supabase JWT and return user info.

    Returns dict with 'id' and 'email' keys.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format.",
        )

    token = authorization[7:]
    secret = _get_jwt_secret()

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
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
