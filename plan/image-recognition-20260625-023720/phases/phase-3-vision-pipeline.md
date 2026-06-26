# Phase 3: Image Support in Pipeline

## Goal
Modify the symptom pipeline to accept images and pass them to medgemma1.5:4b-it-q8_0 via Ollama's `/api/generate` endpoint with the `images` field.

## Files to Change
- `backend/symptom_pipeline.py` — add image support to `_stream_ollama()`, modify `run()` signature

## Implementation Steps

### 3.1 Modify _stream_ollama() to Accept Images (backend/symptom_pipeline.py)
Add optional `image_bytes` parameter:

```python
import base64

async def _stream_ollama(
    prompt: str,
    image_bytes: bytes | None = None,
) -> AsyncGenerator[tuple[str, dict], None]:
    """Stream tokens from Ollama, yielding (event_type, data_dict) tuples."""
    client = _get_ollama_client()

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True,
    }

    # Add image if present (medgemma1.5:4b-it-q8_0 supports vision via images field)
    if image_bytes:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload["images"] = [image_b64]

    # medgemma expects chat-template formatting
    formatted = f"<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n"
    payload["prompt"] = formatted

    try:
        async with client.stream(
            "POST",
            OLLAMA_URL,
            json=payload,
        ) as response:
            # ... rest stays the same ...
```

### 3.2 Modify run() Signature (backend/symptom_pipeline.py)
Add optional image parameters:

```python
async def run(
    query: str,
    session_id: str,
    image_bytes: bytes | None = None,
    image_url: str | None = None,
) -> AsyncGenerator[str, None]:
    """Answer a medical question, yielding SSE events.

    If image_bytes is provided, medgemma1.5:4b-it-q8_0 processes the image with the query.
    """
    set_request_id(uuid.uuid4().hex[:8])
    session_id = re.sub(r'[^a-zA-Z0-9_-]', '', session_id)[:128]

    logger.info("Request: query=%r session=%s has_image=%s", query, session_id, bool(image_bytes))

    # ... existing pipeline logic ...

    # Pass image_bytes to _stream_ollama() at the streaming step
    async for event_type, data in _stream_ollama(prompt, image_bytes):
        yield _sse_event(event_type, data)
        # ...
```

### 3.3 Build Vision-Aware Prompt (backend/symptom_pipeline.py)
When an image is present, add image context to the prompt:

```python
def _build_prompt(
    query: str,
    wiki_context: str,
    fda_context: str,
    history: str,
    has_image: bool = False,
) -> str:
    parts = []

    if history:
        parts.append(f"## PREVIOUS CONVERSATION\n{history}")

    if has_image:
        parts.append(
            "## MEDICAL IMAGE PROVIDED\n"
            "The user has uploaded a medical image (prescription, medication, or medical document). "
            "Analyze the image carefully and identify any drugs, dosages, instructions, or medical information visible."
        )

    if wiki_context:
        parts.append(f"## WIKIPEDIA MEDICAL INFORMATION\n{wiki_context}")

    if fda_context:
        parts.append(f"## FDA DRUG LABEL INFORMATION\n{fda_context}")

    parts.append(f"## USER'S QUESTION\n{query}")
    parts.append(
        "Answer helpfully based on the provided context and image (if any). "
        "Cite sources using [[CITATION:N]] format. "
        "Include a brief medical disclaimer."
    )

    return "\n\n".join(parts)
```

### 3.4 Update Session Save (backend/symptom_pipeline.py)
Pass image_url when saving user message:

```python
# In run(), after streaming completes:
if session_id:
    user_message = query or "[Image uploaded]"
    await session_store.save(session_id, "user", user_message, image_url=image_url)
    await session_store.save(session_id, "assistant", full_text)
```

## Risks
- Base64 encoding large images may use significant memory (10MB image = ~13MB base64)
- medgemma1.5:4b-it-q8_0 may not perform well on all image types (test with real prescriptions)
- Longer timeout needed for image processing (120s may be tight)

## Rollback Notes
- Revert _stream_ollama() to remove image_bytes parameter
- Revert run() to original signature
- Remove has_image from _build_prompt()

## Verification
1. Test image directly: `curl http://localhost:11434/api/generate -d '{"model":"medgemma1.5:4b-it-q8_0","prompt":"What is this?","images":["base64..."],"stream":false}'`
2. Test pipeline with image via /api/chat endpoint
3. Verify text-only queries still work (regression test)
