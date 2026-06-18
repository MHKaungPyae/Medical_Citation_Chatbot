"""Shared retry helper for external HTTP calls.

Both pubmed_client and openfda_client use this instead of maintaining their
own retry loops.
"""

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

# HTTP status codes that are safe to retry.
_RETRYABLE_STATUSES: frozenset[int] = frozenset({429, 502, 503, 504})


def _parse_retry_after(response: httpx.Response) -> float | None:
    """Extract delay in seconds from a ``Retry-After`` header.

    Supports both ``Retry-After: <seconds>`` and ``Retry-After: <HTTP-date>``
    formats (RFC 7231 §7.1.3).  Returns ``None`` if the header is missing
    or unparseable.
    """
    value = response.headers.get("Retry-After", "").strip()
    if not value:
        return None
    # Seconds format: "120"
    if value.isdigit():
        return float(value)
    # HTTP-date format: "Wed, 21 Oct 2015 07:28:00 GMT"
    try:
        from email.utils import parsedate_to_datetime
        retry_dt = parsedate_to_datetime(value)
        import datetime as _dt
        now = _dt.datetime.now(_dt.timezone.utc)
        return max(0.0, (retry_dt - now).total_seconds())
    except (ValueError, TypeError):
        return None


async def retry_get(
    client: httpx.AsyncClient,
    url: str,
    *,
    label: str = "",
    max_retries: int = 3,
    delay: float = 1.0,
) -> httpx.Response:
    """GET *url* with up to *max_retries* on transient errors.

    Retries on: timeout, connection error, 429, 502, 503, 504.
    On 429 responses, parses the ``Retry-After`` header (seconds or HTTP-date)
    to respect the server's rate-limit window.
    Fails immediately on any other HTTP error (4xx auth/client, 5xx non-transient).

    Raises ``httpx.HTTPError`` if all retries are exhausted.
    """
    if max_retries < 1:
        raise ValueError("max_retries must be >= 1")

    last_exc: Exception | None = None
    current_delay = delay

    for attempt in range(1, max_retries + 1):
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            logger.warning("%s attempt %d/%d: %s", label, attempt, max_retries, exc)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in _RETRYABLE_STATUSES:
                last_exc = exc
                # Parse Retry-After header when available (RFC 7231 §7.1.3)
                retry_after = _parse_retry_after(exc.response)
                if retry_after is not None:
                    current_delay = retry_after
                elif exc.response.status_code == 429:
                    # No Retry-After header — use a 10 s floor for rate-limit
                    # windows that span minutes (Semantic Scholar free tier).
                    current_delay = max(current_delay, 10.0)
                logger.warning(
                    "%s attempt %d/%d: HTTP %d",
                    label, attempt, max_retries, exc.response.status_code,
                )
            else:
                raise  # non-transient — fail immediately

        if attempt < max_retries:
            logger.info("%s sleeping %.1fs before retry", label, current_delay)
            await asyncio.sleep(current_delay)
            current_delay = max(current_delay * 2, delay)

    raise last_exc  # type: ignore[misc]
