"""Supabase JWT verification for FastAPI."""

import os
import logging
from typing import Optional

import httpx
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)

_SUPABASE_URL: Optional[str] = None
_SUPABASE_KEY: Optional[str] = None


def _get_supabase_config() -> tuple[str, str]:
    """Return Supabase URL and anon key."""
    global _SUPABASE_URL, _SUPABASE_KEY
    if _SUPABASE_URL is None:
        _SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
        _SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY environment variable.")
    return _SUPABASE_URL, _SUPABASE_KEY


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Verify Supabase JWT via Supabase Auth API and return user info.

    Returns dict with 'id' and 'email' keys.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format.",
        )

    token = authorization[7:]
    supabase_url, supabase_key = _get_supabase_config()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": supabase_key,
                },
            )
            if response.status_code != 200:
                logger.warning(
                    "Supabase auth check failed: %d %s",
                    response.status_code,
                    response.text[:200],
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token.",
                )
            user_data = response.json()
    except httpx.HTTPError as exc:
        logger.error("Supabase auth request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify token.",
        )

    user_id = user_data.get("id")
    email = user_data.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID.",
        )

    return {"id": user_id, "email": email}
