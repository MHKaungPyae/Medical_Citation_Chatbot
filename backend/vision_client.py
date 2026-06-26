"""Vision model client for image analysis using llava:7b."""

import base64
import logging

import httpx

from backend.config import OLLAMA_URL, VISION_MODEL, VISION_TIMEOUT

logger = logging.getLogger(__name__)

_ollama_client: httpx.AsyncClient | None = None


def _get_ollama_client() -> httpx.AsyncClient:
    """Return a shared httpx.AsyncClient for Ollama requests."""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = httpx.AsyncClient(timeout=VISION_TIMEOUT)
    return _ollama_client


async def close_vision_client() -> None:
    """Close the shared vision client. Call on shutdown."""
    global _ollama_client
    if _ollama_client is not None:
        await _ollama_client.aclose()
        _ollama_client = None


async def analyze_image(image_bytes: bytes) -> str:
    """Analyze image with llava:7b and return description.

    Uses a fast vision model to describe the image, then passes
    the description to medgemma for medical interpretation.
    """
    client = _get_ollama_client()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": VISION_MODEL,
        "prompt": (
            "Describe what you see in this image in detail. "
            "If there is any text, medicine, medical equipment, or medical content visible, "
            "describe it thoroughly. Focus on identifying any drugs, prescriptions, "
            "medical scans, or health-related information."
        ),
        "images": [image_b64],
        "stream": False,
    }

    try:
        response = await client.post(
            OLLAMA_URL,
            json=payload,
            timeout=VISION_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()
        description = result.get("response", "")
        logger.info("Image analysis complete: %d chars", len(description))
        return description
    except httpx.TimeoutException:
        logger.warning("Image analysis timed out")
        return "[Image analysis timed out - unable to describe image]"
    except Exception as e:
        logger.error("Image analysis failed: %s", e)
        return "[Image analysis failed - unable to describe image]"
