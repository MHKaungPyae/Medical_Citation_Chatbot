# Phase 2: Backend Image Storage & Upload Endpoint

## Goal
Create a storage helper module and modify the chat endpoint to accept multipart/form-data with optional image upload.

## Files to Change
- `backend/storage_client.py` (new) — Supabase Storage operations
- `backend/main.py` — modify /api/chat to accept file upload
- `backend/session_store.py` — add image_url to save()

## Implementation Steps

### 2.1 Create Storage Client (backend/storage_client.py)
```python
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
```

### 2.2 Modify Chat Endpoint (backend/main.py)
Change from Pydantic model to multipart form:

```python
from fastapi import File, Form, UploadFile
from backend.storage_client import upload_image
from backend.auth import get_current_user
from backend.config import VISION_SUPPORTED_TYPES, VISION_MAX_IMAGE_SIZE

@app.post("/api/chat")
async def chat(
    query: str = Form(...),
    session_id: str = Form(""),
    image: Optional[UploadFile] = File(None),
    authorization: str = Header(...),
):
    # Verify auth
    user = await get_current_user(authorization)
    user_id = user["id"]
    
    query = query.strip()
    session_id = session_id.strip()
    
    if not query and not image:
        async def _empty():
            yield f"event: error\ndata: {{'message': 'Please provide a question or image.', 'code': 'EMPTY_QUERY'}}\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")
    
    # Process image if present
    image_url = None
    image_bytes = None
    
    if image:
        # Validate file type
        if image.content_type not in VISION_SUPPORTED_TYPES:
            async def _bad_type():
                yield f"event: error\ndata: {{'message': 'Unsupported image format. Use JPEG, PNG, or WebP.', 'code': 'INVALID_IMAGE'}}\n\n"
            return StreamingResponse(_bad_type(), media_type="text/event-stream")
        
        # Read and validate size
        image_bytes = await image.read()
        if len(image_bytes) > VISION_MAX_IMAGE_SIZE:
            async def _too_large():
                yield f"event: error\ndata: {{'message': 'Image too large. Max 10MB.', 'code': 'IMAGE_TOO_LARGE'}}\n\n"
            return StreamingResponse(_too_large(), media_type="text/event-stream")
        
        # Upload to Supabase Storage
        image_url = await upload_image(
            user_id=user_id,
            session_id=session_id,
            image_bytes=image_bytes,
            content_type=image.content_type,
            filename=image.filename or "upload.jpg",
        )
        
        if not image_url:
            async def _upload_failed():
                yield f"event: error\ndata: {{'message': 'Failed to upload image. Please try again.', 'code': 'UPLOAD_FAILED'}}\n\n"
            return StreamingResponse(_upload_failed(), media_type="text/event-stream")
    
    async def _safe_stream():
        try:
            async for event in run_symptom_pipeline(
                query=query,
                session_id=session_id,
                image_bytes=image_bytes,
                image_url=image_url,
            ):
                yield event
        except Exception:
            logger.exception("Unhandled error in symptom pipeline")
            yield f"event: error\ndata: {{'message': 'An internal error occurred.', 'code': 'INTERNAL_ERROR'}}\n\n"
    
    return StreamingResponse(_safe_stream(), media_type="text/event-stream")
```

### 2.3 Update Session Store (backend/session_store.py)
Add image_url parameter to save():

```python
async def save(
    self,
    session_id: str,
    role: str,
    content: str,
    image_url: Optional[str] = None,
) -> None:
    """Append a message to session_id."""
    db = get_supabase()
    
    # Ensure session exists
    existing = db.table("chat_sessions").select("id").eq("id", session_id).execute()
    if not existing.data:
        try:
            db.table("chat_sessions").insert({
                "id": session_id,
                "title": content[:100] if role == "user" else "New Chat",
            }).execute()
        except Exception as exc:
            logger.warning("Could not create session %s: %s", session_id, exc)
            return
    
    try:
        insert_data = {
            "session_id": session_id,
            "role": role,
            "content": content,
        }
        if image_url:
            insert_data["image_url"] = image_url
        
        db.table("messages").insert(insert_data).execute()
    except Exception as exc:
        logger.warning("Could not save message to session %s: %s", session_id, exc)
```

### 2.4 Update get_history (backend/session_store.py)
Include image_url in history retrieval:

```python
async def get_history(self, session_id: str) -> str:
    db = get_supabase()
    result = (
        db.table("messages")
        .select("role,content,image_url")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .limit(self._max_turns * 2)
        .execute()
    )
    
    if not result.data:
        return ""
    
    lines = []
    for msg in result.data:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        content = msg["content"]
        if msg.get("image_url"):
            content = f"[User uploaded an image] {content}"
        lines.append(f"{role_label}: {content}")
    return "\n".join(lines)
```

## Risks
- Auth endpoint change (JSON -> Form) breaks existing frontend until Phase 5
- Storage upload may fail silently if Supabase Storage not configured
- Large images may cause memory issues on backend

## Rollback Notes
- Revert main.py to use ChatRequest Pydantic model
- Remove storage_client.py
- Revert session_store.py changes

## Verification
1. Start backend: `PYTHONPATH=. uvicorn backend.main:app --reload --port 8000`
2. Test text-only: `curl -X POST http://localhost:8000/api/chat -F "query=test" -F "session_id=test" -H "Authorization: Bearer TOKEN"`
3. Test with image: `curl -X POST http://localhost:8000/api/chat -F "query=what is this?" -F "session_id=test" -F "image=@test.jpg" -H "Authorization: Bearer TOKEN"`
4. Verify image_url column populated: `SELECT image_url FROM messages WHERE session_id='test';`
