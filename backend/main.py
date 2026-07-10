"""FastAPI backend for Medical Citation Chatbot."""

import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.config import ErrorCode
from backend.logging_setup import setup_logging
from backend.openfda_client import close_client as close_openfda_client, init_client as init_openfda_client
from backend.routers.session_routes import router as session_router
from backend.symptom_pipeline import close_ollama_client, init_ollama_client, run as run_symptom_pipeline
from backend.wiki_client import close_client as close_wiki_client, init_client as init_wiki_client

logger = logging.getLogger(__name__)

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize httpx clients at startup, close them on shutdown."""
    init_wiki_client()
    init_openfda_client()
    init_ollama_client()
    logger.info("HTTP clients initialized")
    yield
    await close_wiki_client()
    await close_openfda_client()
    await close_ollama_client()
    logger.info("HTTP clients closed")


app = FastAPI(title="Medical Citation Chatbot", version="0.1.0", lifespan=lifespan)

_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(session_router)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="The user's medical question")
    session_id: str = Field(default="", max_length=128, description="Session identifier")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(get_current_user)):
    query = body.query.strip()
    session_id = body.session_id.strip() or uuid.uuid4().hex
    user_id = current_user.get("id", "")

    if not query:
        async def _empty():
            yield f"event: error\ndata: {json.dumps({'message': 'Please provide a question.', 'code': ErrorCode.EMPTY_QUERY})}\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    async def _safe_stream():
        try:
            async for event in run_symptom_pipeline(query, session_id, user_id):
                yield event
        except Exception:
            logger.exception("Unhandled error in symptom pipeline")
            yield f"event: error\ndata: {json.dumps({'message': 'An internal error occurred. Please try again.', 'code': ErrorCode.INTERNAL_ERROR})}\n\n"

    return StreamingResponse(
        _safe_stream(),
        media_type="text/event-stream",
    )
