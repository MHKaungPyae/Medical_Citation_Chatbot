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

    async def save(self, session_id: str, role: str, content: str, user_id: str, citations_json: str | None = None) -> None:
        """Append a message to *session_id*. Creates session if it doesn't exist.

        Verifies the session belongs to *user_id* before writing. If the
        session does not exist, it is created with the given *user_id*.
        """
        if not user_id:
            logger.error("save() called with empty user_id — refusing to write")
            return

        db = get_supabase()

        # Ensure session exists (create if missing) and verify ownership
        existing = db.table("chat_sessions").select("user_id").eq("id", session_id).execute()
        if not existing.data:
            try:
                db.table("chat_sessions").insert({
                    "id": session_id,
                    "user_id": user_id,
                    "title": content[:100] if role == "user" else "New Chat",
                }).execute()
            except Exception as exc:
                logger.warning("Could not create session %s: %s", session_id, exc)
                return
        else:
            # Session exists — verify the caller owns it
            owner = existing.data[0].get("user_id", "")
            if owner and owner != user_id:
                logger.warning(
                    "Ownership mismatch: session %s belongs to %s, not %s",
                    session_id, owner, user_id,
                )
                return

        try:
            msg_data: dict = {
                "session_id": session_id,
                "role": role,
                "content": content,
            }
            if citations_json is not None:
                msg_data["citations_json"] = citations_json
            db.table("messages").insert(msg_data).execute()
        except Exception as exc:
            logger.warning("Could not save message to session %s: %s", session_id, exc)

    def reset(self) -> None:
        """No-op for compatibility. Use DB cleanup in tests."""
        pass


# Singleton used by the FastAPI app.
session_store = SessionStore()
