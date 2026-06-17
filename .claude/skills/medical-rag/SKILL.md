# Medical RAG Chatbot — Project Skill

## Purpose
This skill enforces the architectural constraints of the Medical Citation Chatbot. Loaded automatically when Claude Code works in this project directory, it ensures all code, suggestions, and changes respect the chosen stack.

## Tech Stack (Non-Negotiable)

### Backend
- **Framework:** FastAPI (Python 3.10+), NOT Flask, NOT Django.
- **HTTP Client:** `httpx` with async support for all outbound API calls.
- **LLM Runtime:** Ollama, running locally at `http://localhost:11434`, model `medgemma:4b-it`.
- **Streaming:** Server-Sent Events (SSE) over HTTP, NOT WebSockets.

### Frontend
- **Framework:** React with Next.js (App Router) and TypeScript.
- **Styling:** Tailwind CSS.
- **Stream Consumption:** `fetch()` with `ReadableStream` or `EventSource` to consume SSE from the FastAPI backend.

### Data Sources (Live APIs Only)
- **PubMed:** NCBI E-utilities API (`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`). Two-step pipeline: `esearch` → `efetch`.
- **OpenFDA:** Drug Label API (`https://api.fda.gov/drug/label.json`), NOT the `/drug/event` endpoint.
- **NO local databases, NO vector stores, NO ChromaDB, NO FAISS, NO SQLite for document storage.** All retrieval is live from the web.

## Rules

### DO NOT suggest or use:
- Any local vector database (ChromaDB, FAISS, LanceDB, Milvus, Pinecone, Weaviate, Qdrant).
- Any embedded document store or offline RAG pipeline.
- Flask, Django, or any Python web framework other than FastAPI.
- Any frontend framework other than Next.js + React + Tailwind.
- Any cloud LLM APIs (OpenAI, Anthropic, Groq, Together). The model MUST be local via Ollama.
- WebSockets for streaming — use SSE only.

### ALWAYS use:
- `httpx.AsyncClient` for all outbound HTTP from the backend.
- Structured return types (Pydantic models or typed dicts) for API client responses.
- SSE event types as defined in the plan: `token`, `citation`, `done`, `error`, `warning`.
- Citation format: `[[CITATION:N]]` markers, not bare `[1]` brackets.
- Concurrent API calls via `asyncio.gather()` — PubMed and OpenFDA searches run in parallel.

### Error Handling:
- Every external API call must have a timeout and catch `httpx.TimeoutException` and `httpx.ConnectError`.
- API clients must never crash the caller — return empty/fallback data on failure and log the error.
- SSE connections must never hang — always emit `event: error` on failure before closing.

### Code Organization:
- `backend/` — all Python code (FastAPI server, API clients, prompts, query classifier).
- `frontend/` — all Next.js/React code.
- `tests/` — pytest for backend, vitest for frontend.
- `.env` — API keys and configuration (NCBI_API_KEY, etc.).
