# Requirements Analysis

## Functional Requirements

1. **User Registration** — email + password, returns JWT.
2. **User Login** — email + password, returns JWT.
3. **Persistent Chat Sessions** — CRUD operations tied to authenticated user.
4. **Persistent Messages** — each message stored with role, content, citations, timestamp.
5. **Conversation History for LLM** — last N messages from DB fed into prompt (replaces in-memory window).
6. **Session Listing** — user can see all their past sessions in sidebar.
7. **Session Switching** — clicking a session loads its messages from DB.
8. **Session Deletion** — user can delete sessions (cascades to messages).

## Non-Functional Requirements

1. **SSE streaming must not break** — the `/api/chat` endpoint must still stream tokens via SSE.
2. **Existing citation system unchanged** — `[[CITATION:N]]` markers, inline badges, citation pills.
3. **Absolute imports** — all backend code uses `from backend.xxx import ...`.
4. **No external DB server** — SQLite file-based, no PostgreSQL/MySQL setup required.
5. **Minimal new dependencies** — only add what is necessary.

## Constraints from CLAUDE.md

- Backend: FastAPI (not Flask/Django), httpx for HTTP, Ollama for LLM, SSE for streaming.
- Frontend: Next.js 16, React, TypeScript, Tailwind CSS.
- No vector databases, no ChromaDB, no FAISS.
- No cloud LLM APIs.
- Citation format: `[[CITATION:N]]` markers.
- Error handling: API clients return empty/fallback on failure, never crash caller.
- Logging: structured with request-ID.

## Out of Scope (for now)

- Email verification
- Password reset
- OAuth/social login
- Refresh tokens
- Rate limiting
- Admin panel
- Export/import of chat history
- Multi-device sync beyond DB persistence
