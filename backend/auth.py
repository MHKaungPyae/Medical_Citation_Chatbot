"""Supabase JWT verification for FastAPI.

Verifies JWTs locally using PyJWT — no network call to Supabase.
"""

import base64
import json
import logging

from fastapi import Header, HTTPException, status

import jwt as _jwt
from cryptography.hazmat.primitives.asymmetric.ec import (
    SECP256R1,
    EllipticCurvePublicNumbers,
)

from backend.config import SUPABASE_JWT_SECRET, SUPABASE_JWT_SIGNING_KEY

logger = logging.getLogger(__name__)


def _build_ec_key_from_jwk(jwk_json: str):
    """Build an EC public key from a JWK JSON string."""
    jwk = json.loads(jwk_json)
    # Handle both single key and {"keys": [...]} format
    key_data = jwk["keys"][0] if "keys" in jwk else jwk
    x = int.from_bytes(base64.urlsafe_b64decode(key_data["x"] + "=="), "big")
    y = int.from_bytes(base64.urlsafe_b64decode(key_data["y"] + "=="), "big")
    return EllipticCurvePublicNumbers(x, y, SECP256R1()).public_key()


# Pre-build the EC key at import time from JWK signing key
_EC_KEY = None
if SUPABASE_JWT_SIGNING_KEY:
    try:
        _EC_KEY = _build_ec_key_from_jwk(SUPABASE_JWT_SIGNING_KEY)
        logger.info("EC public key built from SUPABASE_JWT_SIGNING_KEY")
    except Exception as e:
        logger.warning("Could not build EC key from signing key: %s", e)


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

    # Decode header to determine algorithm
    header = {}
    try:
        header_b64 = token.split(".")[0]
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
    except Exception:
        pass

    # Choose key based on algorithm
    alg = header.get("alg", "")
    if alg == "ES256" and _EC_KEY is not None:
        key = _EC_KEY
    elif SUPABASE_JWT_SECRET:
        key = SUPABASE_JWT_SECRET
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No JWT verification key configured.",
        )

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
