"""Supabase Storage operations for image uploads."""

import logging
import time
import uuid
from typing import Optional

from backend.config import STORAGE_BUCKET, STORAGE_SIGNED_URL_EXPIRY
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)


async def upload_image(
    user_id: str,
    session_id: str,
    image_bytes: bytes,
    content_type: str,
    filename: str,
) -> Optional[str]:
    """Upload image to Supabase Storage and return signed URL.

    Returns None if upload fails.
    """
    db = get_supabase()

    # Generate unique path: user_id/session_id/timestamp_uuid.ext
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique_name = f"{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    path = f"{user_id}/{session_id}/{unique_name}"

    try:
        db.storage.from_(STORAGE_BUCKET).upload(
            path=path,
            file=image_bytes,
            file_options={"content-type": content_type},
        )

        # Get signed URL
        result = db.storage.from_(STORAGE_BUCKET).create_signed_url(
            path=path,
            expires_in=STORAGE_SIGNED_URL_EXPIRY,
        )

        signed_url = result.get("signedURL") or result.get("signed_url")
        if signed_url:
            logger.info("Image uploaded: %s", path)
            return signed_url

        logger.error("No signed URL in storage response: %s", result)
        return None

    except Exception as exc:
        logger.error("Image upload failed: %s", exc)
        return None
