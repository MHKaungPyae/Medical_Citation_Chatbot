"""FastAPI backend for Medical Citation Chatbot."""

import json
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.logging_setup import setup_logging
from backend.symptom_pipeline import run as run_symptom_pipeline

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    query = body.get("query", "").strip()
    session_id = body.get("session_id", "")

    if not query:
        async def _empty():
            yield f"event: error\ndata: {json.dumps({'message': 'Please provide a question.', 'code': 'EMPTY_QUERY'})}\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    async def _safe_stream():
        try:
            async for event in run_symptom_pipeline(query, session_id):
                yield event
        except Exception:
            logger.exception("Unhandled error in symptom pipeline")
            yield f"event: error\ndata: {json.dumps({'message': 'An internal error occurred. Please try again.', 'code': 'INTERNAL_ERROR'})}\n\n"

    return StreamingResponse(
        _safe_stream(),
        media_type="text/event-stream",
    )
