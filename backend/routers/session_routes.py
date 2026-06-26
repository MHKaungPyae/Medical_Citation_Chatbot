"""CRUD endpoints for chat sessions and messages."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


# ── request/response models ─────────────────────────────────────────────

class SessionCreate(BaseModel):
    title: str = Field(default="New Chat", max_length=200)


class SessionUpdate(BaseModel):
    title: str = Field(..., max_length=200)


class SessionOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    citations_json: str | None = None
    image_url: str | None = None
    created_at: str


# ── endpoints ───────────────────────────────────────────────────────────

@router.get("", response_model=list[SessionOut])
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List all sessions for the current user."""
    db = get_supabase()
    result = (
        db.table("chat_sessions")
        .select("id,title,created_at,updated_at")
        .eq("user_id", current_user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return [
        SessionOut(
            id=s["id"],
            title=s["title"],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        )
        for s in (result.data or [])
    ]


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new session."""
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("chat_sessions")
        .insert({
            "user_id": current_user["id"],
            "title": body.title,
            "created_at": now,
            "updated_at": now,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session.")
    s = result.data[0]
    return SessionOut(id=s["id"], title=s["title"], created_at=s["created_at"], updated_at=s["updated_at"])


@router.get("/{session_id}/messages", response_model=list[MessageOut])
async def get_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all messages for a session (with ownership check)."""
    db = get_supabase()
    _verify_ownership(db, session_id, current_user["id"])

    result = (
        db.table("messages")
        .select("id,role,content,citations_json,image_url,created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [
        MessageOut(
            id=m["id"],
            role=m["role"],
            content=m["content"],
            citations_json=m.get("citations_json"),
            image_url=m.get("image_url"),
            created_at=m["created_at"],
        )
        for m in (result.data or [])
    ]


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: str,
    body: SessionUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update session title."""
    db = get_supabase()
    _verify_ownership(db, session_id, current_user["id"])

    now = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("chat_sessions")
        .update({"title": body.title, "updated_at": now})
        .eq("id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    s = result.data[0]
    return SessionOut(id=s["id"], title=s["title"], created_at=s["created_at"], updated_at=s["updated_at"])


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    db = get_supabase()
    _verify_ownership(db, session_id, current_user["id"])
    db.table("chat_sessions").delete().eq("id", session_id).execute()


# ── helpers ─────────────────────────────────────────────────────────────

def _verify_ownership(db, session_id: str, user_id: str):
    """Verify the session belongs to the user."""
    result = (
        db.table("chat_sessions")
        .select("user_id")
        .eq("id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if result.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
