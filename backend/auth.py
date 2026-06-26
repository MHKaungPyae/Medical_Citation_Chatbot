"""Supabase JWT verification for FastAPI."""

import base64
import os
import logging
from typing import Optional

import httpx
from fastapi import Header, HTTPException, status
from jose import JWTError, jwt, jwk

logger = logging.getLogger(__name__)

_SUPABASE_JWT_SECRET: Optional[bytes] = None
_JWKS_CACHE: Optional[dict] = None


def _get_jwt_secret() -> bytes:
    """Return the JWT secret, base64-decoded (Supabase provides it encoded)."""
    global _SUPABASE_JWT_SECRET
    if _SUPABASE_JWT_SECRET is None:
        raw = os.environ.get("SUPABASE_JWT_SECRET", "")
        if not raw:
            raise RuntimeError("Missing SUPABASE_JWT_SECRET environment variable.")
        # Supabase provides the secret as base64 — decode it
        try:
            _SUPABASE_JWT_SECRET = base64.b64decode(raw)
        except Exception:
            # If it's not valid base64, use as-is
            _SUPABASE_JWT_SECRET = raw.encode()
    return _SUPABASE_JWT_SECRET


def _get_jwks() -> dict:
    """Fetch JWKS from Supabase for ES256 token verification."""
    global _JWKS_CACHE
    if _JWKS_CACHE is not None:
        return _JWKS_CACHE

    supabase_url = os.environ.get("SUPABASE_URL", "")
    if not supabase_url:
        raise RuntimeError("Missing SUPABASE_URL environment variable.")

    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE = resp.json()
        return _JWKS_CACHE
    except Exception as exc:
        logger.error("Failed to fetch JWKS from Supabase: %s", exc)
        raise RuntimeError(f"Cannot fetch JWKS: {exc}")


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

    # Try HS256 with SUPABASE_JWT_SECRET first (legacy)
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256", "HS384", "HS512"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if user_id:
            return {"id": user_id, "email": email}
    except JWTError:
        pass  # Fall through to ES256

    # Try ES256 with JWKS public key (Supabase default since 2025)
    try:
        # Decode header to get kid
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        alg = unverified.get("alg", "")

        if alg != "ES256":
            raise JWTError(f"Unsupported algorithm: {alg}")

        jwks = _get_jwks()
        keys = jwks.get("keys", [])

        # Find matching key by kid
        matching_key = None
        for key in keys:
            if key.get("kid") == kid:
                matching_key = key
                break

        if not matching_key:
            raise JWTError(f"No matching key found for kid: {kid}")

        # Construct EC key from JWK
        public_key = jwk.construct(matching_key)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if user_id:
            return {"id": user_id, "email": email}
    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token missing user ID.",
    )
