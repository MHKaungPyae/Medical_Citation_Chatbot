"""Structured logging with request-ID injection.

Every log line from any module carries a ``[request_id]`` column so a single
user query can be traced across wiki_client, openfda_client, and main.py
without threading a request-id parameter through every function signature.
"""

import contextvars
import logging

# Context variable — set at the start of each chat request, read by the
# filter on every log call, even in submodules.
_request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


def get_request_id() -> str:
    """Return the current request ID (or ``"-"`` if not set)."""
    return _request_id_var.get()


def set_request_id(rid: str) -> None:
    """Set the request ID for the current async context."""
    _request_id_var.set(rid)


class _RequestIdFilter(logging.Filter):
    """Inject the context-var request_id into every log record."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_var.get()
        return True


_configured = False


def setup_logging(level: int = logging.INFO) -> None:
    """Install the structured handler on the root logger.

    Safe to call multiple times — only the first call installs handlers.
    """
    global _configured
    if _configured:
        return
    _configured = True

    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(request_id)s] %(name)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    ))
    logging.basicConfig(level=level, handlers=[handler])
