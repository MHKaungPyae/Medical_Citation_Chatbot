---
name: medical-rag-builder
description: |
  General-purpose subagent for building and maintaining the Medical Citation Chatbot.
  Use it to implement new features, fix bugs, or refactor code across backend and frontend modules.
tools: Read, Grep, Glob, Bash
model: inherit
permissionMode: default
skills:
  - medical-rag
---
<!-- vibekit:pack=core-vibe-coder -->

# Medical RAG Builder — Subagent

## Purpose

A general-purpose subagent for building and maintaining the Medical Citation Chatbot. Use it to implement new features, fix bugs, or refactor code across backend and frontend modules. Spawn multiple instances in parallel for independent tasks; use a single instance for sequential work.

## When to Use

| Use this agent for | Don't use for |
|---------------------|---------------|
| Implementing a new backend client or frontend component | Trivial one-line fixes |
| Adding a new API endpoint or hook | Tasks that need interactive user feedback |
| Writing or updating tests | Tasks that modify the same file as another agent |
| Refactoring a module (e.g. extracting helpers) | Research or exploration (use the main session) |
| Bug fixes with clear scope | Architecture decisions (discuss in main session first) |

## Model Selection

| Task | Model | Why |
|------|-------|-----|
| Implementation (new file, new endpoint, new component) | sonnet | Fast, cost-effective for well-scoped code generation |
| Bug fix with known root cause | sonnet | Mechanical — apply fix, verify |
| Adversarial code review | opus | Higher reasoning for catching subtle bugs and edge cases |
| Architecture refactoring (multiple files) | opus | Needs broader context and design judgment |

Default to **sonnet** unless the task requires deep reasoning across multiple files.

## Invocation Pattern

```
# Single agent — sequential task
Agent(prompt="Implement X in backend/module.py following existing patterns in the codebase.", model="sonnet")

# Parallel agents — independent tasks
parallel([
  () => Agent(prompt="Create backend/new_client.py ...", model="sonnet"),
  () => Agent(prompt="Create frontend/components/NewComponent.tsx ...", model="sonnet"),
])

# Adversarial review — after implementation
Agent(prompt="Review the following files for bugs, edge cases, and security issues: ...", model="opus")
```

## Codebase Reference

### Backend (13 Python modules)

| Module | Purpose |
|--------|---------|
| `backend/main.py` | FastAPI server — SSE streaming route, session router, shutdown hooks |
| `backend/symptom_pipeline.py` | Self-contained pipeline — prompt building, drug extraction, context formatting, Ollama streaming |
| `backend/wiki_client.py` | Wikipedia MediaWiki API — raw query search + plain-text extracts |
| `backend/openfda_client.py` | OpenFDA drug label API — OTC + Rx field extraction, DailyMed links |
| `backend/config.py` | Centralised configuration — endpoints, timeouts, model name, prompt limits, `load_dotenv` |
| `backend/retry.py` | Shared HTTP retry helper — Retry-After parsing, exponential backoff |
| `backend/session_store.py` | Supabase-backed session/message persistence |
| `backend/auth.py` | JWT verification middleware — `python-jose`, `get_current_user` dependency |
| `backend/routers/session_routes.py` | Session CRUD API — GET/POST/PATCH/DELETE, auth-protected with ownership checks |
| `backend/supabase_client.py` | Supabase client singleton (service_role key) |
| `backend/logging_setup.py` | Structured logging with request-ID injection via contextvar |
| `backend/__init__.py` | Package marker |
| `backend/routers/__init__.py` | Package marker |

### Frontend (32 TypeScript/TSX files)

| Directory | Key files |
|-----------|-----------|
| `hooks/` | `useChatController` (orchestrator), `useChatReducer` (12 actions), `useChatStream` (SSE consumer), `useSessionStore` (API CRUD), `useScrollManager`, `useAuth` |
| `components/` | `ChatContainer`, `MessageList`, `MessageBubble`, `InlineCitation`, `CitationPill`, `Sidebar`, `SendButton`, `AutoExpandTextarea`, `EmptyState`, `StatusBubble`, `StreamingDots`, `ErrorBoundary`, `Icons`, `AuthProvider`, `AuthCard`, `AuthInput`, `AuthButton` |
| `lib/` | `types.ts`, `constants.ts`, `utils.ts`, `supabase.ts`, `api.ts` |
| `app/` | `layout.tsx`, `page.tsx`, `login/page.tsx`, `register/page.tsx` |

## Rules

When spawning this agent, include these constraints in the prompt:

1. **Follow existing patterns.** Match the code style, import conventions, and error handling of surrounding code.
2. **Backend uses absolute imports.** `from backend.module import ...`, run with `PYTHONPATH=.` from project root.
3. **All external HTTP calls use `httpx.AsyncClient`** via shared `_get_client()` helpers. Never use `requests`.
4. **API clients never crash the caller.** Return empty/fallback data on failure, log the error.
5. **All external calls have timeouts** and catch `httpx.TimeoutException` + `httpx.ConnectError`.
6. **SSE event types:** `token`, `citation`, `done`, `error`, `warning`, `info`.
7. **Citation format:** `[[CITATION:N]]` markers, rendered as `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) inline.
8. **Frontend components use `React.memo`** for render-heavy components. Use `'use client'` directive.
9. **Never hardcode secrets.** Use `load_dotenv()` in backend, `process.env.NEXT_PUBLIC_*` in frontend.
10. **Clear `__pycache__`** after backend code changes before restarting uvicorn.

## Logging

All subagent usage is recorded in: `docs/superpowers/specs/2026-06-17-subagent-usage.md`
