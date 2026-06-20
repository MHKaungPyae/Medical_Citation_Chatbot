"""In-memory conversation history with auto-pruning.

Replaces the loose defaultdict + timestamps from the old main.py with a
self-contained class that can be tested independently.
"""

import logging
import time
from collections import defaultdict

from backend.config import MAX_HISTORY_TURNS, SESSION_TTL_SECONDS

logger = logging.getLogger(__name__)


class SessionStore:
    """Thread-safe in-memory store for conversation history.

    Each session maps to a list of ``{"role": str, "content": str}`` dicts.
    Sessions untouched for more than *ttl_seconds* are pruned on access.
    """

    def __init__(
        self,
        max_turns: int = MAX_HISTORY_TURNS,
        ttl_seconds: int = SESSION_TTL_SECONDS,
    ) -> None:
        self._max_turns = max_turns
        self._ttl_seconds = ttl_seconds
        self._conversations: dict[str, list[dict]] = defaultdict(list)
        self._timestamps: dict[str, float] = {}
        self._last_prune: float = 0.0
        self._prune_interval: float = 60.0  # seconds between prune runs

    # -- public API ---------------------------------------------------------

    def get_history(self, session_id: str) -> str:
        """Return formatted conversation history for *session_id*.

        Returns the empty string when no history exists (new session or
        previously pruned).
        """
        self._touch(session_id)
        self._maybe_prune()

        history = self._conversations.get(session_id, [])
        if not history:
            return ""

        # Keep only the last N turns (N turns = 2*N messages)
        recent = history[-(self._max_turns * 2):]
        lines: list[str] = []
        for msg in recent:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role_label}: {msg['content']}")
        return "\n".join(lines)

    def save(self, session_id: str, role: str, content: str) -> None:
        """Append a message to *session_id*."""
        self._conversations[session_id].append({"role": role, "content": content})
        self._touch(session_id)

    def reset(self) -> None:
        """Clear all sessions. Useful in tests."""
        self._conversations.clear()
        self._timestamps.clear()
        self._last_prune = 0.0

    # -- internals ----------------------------------------------------------

    def _touch(self, session_id: str) -> None:
        self._timestamps[session_id] = time.time()

    def _maybe_prune(self) -> None:
        """Prune expired sessions at most once per _prune_interval."""
        now = time.time()
        if now - self._last_prune < self._prune_interval:
            return
        self._last_prune = now
        self._prune()

    def _prune(self) -> None:
        """Remove sessions that have not been touched in *ttl_seconds*."""
        now = time.time()
        expired = [
            sid
            for sid, ts in self._timestamps.items()
            if now - ts > self._ttl_seconds
        ]
        for sid in expired:
            del self._conversations[sid]
            del self._timestamps[sid]
        if expired:
            logger.info("Pruned %d expired sessions", len(expired))


# Singleton used by the FastAPI app.
session_store = SessionStore()
