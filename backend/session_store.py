"""Supabase-backed conversation history store.

Preserves the same interface as the old in-memory store so
symptom_pipeline.py only needs ``await`` added at call sites.
"""

import logging
from backend.config import MAX_HISTORY_TURNS
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class SessionStore:
    """Store for conversation history backed by Supabase PostgreSQL."""

    def __init__(self, max_turns: int = MAX_HISTORY_TURNS) -> None:
        self._max_turns = max_turns

    async def get_history(self, session_id: str) -> str:
        """Return formatted conversation history for *session_id*.

        Returns the empty string when no history exists.
        """
        db = get_supabase()
        result = (
            db.table("messages")
            .select("role,content")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .limit(self._max_turns * 2)
            .execute()
        )

        if not result.data:
            return ""

        lines: list[str] = []
        for msg in result.data:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role_label}: {msg['content']}")
        return "\n".join(lines)

    async def save(self, session_id: str, role: str, content: str) -> None:
        """Append a message to *session_id*."""
        db = get_supabase()
        db.table("messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
        }).execute()

    async def save_citations(self, session_id: str, citations_json: str) -> None:
        """Update the last assistant message with citation data."""
        db = get_supabase()
        # Get the last assistant message for this session
        result = (
            db.table("messages")
            .select("id")
            .eq("session_id", session_id)
            .eq("role", "assistant")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            db.table("messages").update({
                "citations_json": citations_json,
            }).eq("id", result.data[0]["id"]).execute()

    def reset(self) -> None:
        """No-op for compatibility. Use DB cleanup in tests."""
        pass


# Singleton used by the FastAPI app.
session_store = SessionStore()
