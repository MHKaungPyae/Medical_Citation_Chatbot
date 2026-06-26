"""FastAPI backend for Medical Citation Chatbot."""

import json
import logging
from typing import Optional

from fastapi import FastAPI, File, Form, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.config import ErrorCode, MAX_IMAGE_SIZE, SUPPORTED_IMAGE_TYPES
from backend.logging_setup import setup_logging
from backend.openfda_client import close_client as close_openfda_client
from backend.routers.session_routes import router as session_router
from backend.storage_client import upload_image
from backend.symptom_pipeline import run as run_symptom_pipeline
from backend.vision_client import close_vision_client
from backend.wiki_client import close_client as close_wiki_client

logger = logging.getLogger(__name__)

setup_logging()

app = FastAPI(title="Medical Citation Chatbot", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="The user's medical question")
    session_id: str = Field(default="", max_length=128, description="Session identifier")


@app.on_event("shutdown")
async def shutdown_event():
    await close_wiki_client()
    await close_openfda_client()
    await close_vision_client()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(body: ChatRequest):
    query = body.query.strip()
    session_id = body.session_id

    if not query:
        async def _empty():
            yield f"event: error\ndata: {json.dumps({'message': 'Please provide a question.', 'code': ErrorCode.EMPTY_QUERY})}\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    async def _safe_stream():
        try:
            async for event in run_symptom_pipeline(query, session_id):
                yield event
        except Exception:
            logger.exception("Unhandled error in symptom pipeline")
            yield f"event: error\ndata: {json.dumps({'message': 'An internal error occurred. Please try again.', 'code': ErrorCode.INTERNAL_ERROR})}\n\n"

    return StreamingResponse(
        _safe_stream(),
        media_type="text/event-stream",
    )


@app.post("/api/chat/image")
async def chat_with_image(
    query: str = Form(""),
    session_id: str = Form(""),
    image: UploadFile = File(...),
    authorization: str = Header(...),
):
    """Chat endpoint with image upload. Accepts multipart/form-data."""
    # Verify auth
    user = await get_current_user(authorization)
    user_id = user["id"]

    query = query.strip()
    session_id = session_id.strip()

    # Validate file type
    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        async def _bad_type():
            yield f"event: error\ndata: {json.dumps({'message': 'Unsupported image format. Use JPEG, PNG, or WebP.', 'code': 'INVALID_IMAGE'})}\n\n"
        return StreamingResponse(_bad_type(), media_type="text/event-stream")

    # Read and validate size
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        async def _too_large():
            yield f"event: error\ndata: {json.dumps({'message': 'Image too large. Max 10MB.', 'code': 'IMAGE_TOO_LARGE'})}\n\n"
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
            yield f"event: error\ndata: {json.dumps({'message': 'Failed to upload image. Please try again.', 'code': 'UPLOAD_FAILED'})}\n\n"
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
            yield f"event: error\ndata: {json.dumps({'message': 'An internal error occurred.', 'code': ErrorCode.INTERNAL_ERROR})}\n\n"

    return StreamingResponse(_safe_stream(), media_type="text/event-stream")
