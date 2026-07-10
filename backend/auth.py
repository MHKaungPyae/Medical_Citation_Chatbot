"""Supabase JWT verification for FastAPI.

Verifies JWTs locally using PyJWT — no network call to Supabase.
"""

import base64
import json
import logging
from typing import Optional

from fastapi import Header, HTTPException, status

import jwt as _jwt
from cryptography.hazmat.primitives.asymmetric.ec import (
    SECP256R1,
    EllipticCurvePublicNumbers,
)

from backend.config import SUPABASE_JWT_SECRET

logger = logging.getLogger(__name__)

# Log which jwt module is loaded on startup
logger.info("JWT module loaded from: %s", _jwt.__file__)


def _build_ec_key(secret: str):
    """Build an EC public key from a base64-encoded raw key (x || y coordinates)."""
    raw = base64.b64decode(secret)
    x = int.from_bytes(raw[:32], "big")
    y = int.from_bytes(raw[32:], "big")
    return EllipticCurvePublicNumbers(x, y, SECP256R1()).public_key()


# Pre-build the EC key at import time
_EC_KEY = None
try:
    _EC_KEY = _build_ec_key(SUPABASE_JWT_SECRET)
    logger.info("EC public key built from SUPABASE_JWT_SECRET")
except Exception as e:
    logger.warning("Could not build EC key (will use raw secret for HS256): %s", e)

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

    # Debug: decode header to see algorithm
    try:
        header_b64 = token.split(".")[0]
        # Fix base64 padding
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        logger.info("JWT header: %s", header)
    except Exception as e:
        logger.warning("Could not decode JWT header: %s", e)

    # Choose key based on algorithm
    alg = header.get("alg", "") if header else ""
    if alg == "ES256" and _EC_KEY is not None:
        key = _EC_KEY
    else:
        key = jwt_secret

    try:
        payload = _jwt.decode(
            token,
            key,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False},
        )
    except Exception as exc:
        logger.warning("JWT verification failed (%s): %s", type(exc).__name__, exc)
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
