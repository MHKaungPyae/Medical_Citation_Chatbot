# Project Overview — Medical Chatbot (Generative RAG)

**Goal:** Generative medical chatbot using FastAPI + Next.js + Ollama (medgemma1.5:4b-it-q4_K_M) with live Wikipedia + OpenFDA data, Supabase auth + persistence.

**Status:** Phases 0–6 complete. Remaining: unit tests (Phase 7), evaluation baseline (Phase 8).

**Key files:**
- `backend/symptom_pipeline.py` — self-contained pipeline
- `backend/main.py` — FastAPI server + SSE streaming
- `backend/auth.py` — JWT verification
- `backend/routers/session_routes.py` — session CRUD API
- `frontend/app/page.tsx` — main chat page (auth-protected)
- `frontend/app/login/page.tsx` — login page
- `frontend/app/register/page.tsx` — register page
- `frontend/hooks/useChatController.ts` — chat state management
- `frontend/hooks/useSessionStore.ts` — Supabase-backed sessions

**Phases:** 8 total, 6 complete, 2 remaining.
