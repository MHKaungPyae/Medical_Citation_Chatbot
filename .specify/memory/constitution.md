<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: None (new constitution)
  Added sections:
    - I. Generative First (No Hardcoded Prompts)
    - II. Live Data Grounding
    - III. Simplicity & Minimal Code
    - IV. User-Driven Design
    - V. Streaming Transparency
    - Additional Constraints: Technology Stack & Security
    - Development Workflow
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed (constitution check gate is generic)
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
  Follow-up TODOs: None
-->

# Medical Chatbot Constitution

## Core Principles

### I. Generative First (No Hardcoded Prompts)

The LLM (`qwen2.5:7b`) is the decision-maker. The pipeline MUST provide context and minimal
guidance only — never prescribe behavior, suggest specific medications, or reject queries
based on keyword matching. No system prompts. No classifier modules. The model answers
generatively from retrieved context.

**Rationale:** Hardcoded prompts and keyword lists break on real-world queries (e.g.,
"explain about paracetamol and I took glucosamine and have a rash"). A generative approach
handles any input without brittle rules.

**Enforcement:** No new files that contain prompt templates, keyword lists, or query
classification logic. The `_build_prompt()` function in `symptom_pipeline.py` is the sole
place prompt assembly happens — it MUST remain minimal (context + "answer the question,
cite sources, include disclaimer").

### II. Live Data Grounding

Every response MUST be grounded in live retrieved data from Wikipedia and/or OpenFDA.
The pipeline MUST always attempt retrieval regardless of query content. Never answer
solely from the model's training data unless both APIs return empty results.

**Rationale:** Medical information changes. Training data goes stale. Live APIs provide
current FDA labels and Wikipedia articles that the model's weights alone cannot guarantee.

**Enforcement:** Phase 1 (Wikipedia) and Phase 3 (OpenFDA) MUST execute for every query.
No early-return paths that skip retrieval based on query analysis.

### III. Simplicity & Minimal Code

Fewer files, fewer abstractions. The pipeline is self-contained in a single module
(`symptom_pipeline.py`). Configuration lives in one file (`config.py`). Shared utilities
go in their own module (`retry.py`) but are kept small and obvious. Delete code that
isn't called.

**Rationale:** Each new file and abstraction adds cognitive load, import complexity, and
maintenance burden. A single-file pipeline with inline helpers is easier to read, debug,
and modify than a multi-module package.

**Enforcement:**
- Backend MUST stay under 10 source files excluding `__init__.py` and `requirements.txt`.
- New modules require justification and sign-off — prefer extending existing files.
- Dead code (unused imports, uncalled functions, commented-out blocks) MUST be removed.
- `grep` for references before adding — reuse what exists.

### IV. User-Driven Design

The user's feedback overrides any design assumption. When the user says "I don't want
those files," those files are deleted — no argument, no compromise. Testing is done by
running servers, not by writing unit tests, unless the user explicitly asks for them.

**Rationale:** The user is the builder and the user of this project. Features that don't
match their workflow (empty test directories, overly structured pipelines, prompts that
constrain the model) are waste.

**Enforcement:**
- No test files (`tests/`, `*.test.*`, `*.spec.*`) unless the user asks for them.
- No documentation files beyond what the user needs (`spec.md`, `plan.md`, `README.md`).
- Architectural changes (new dependencies, new modules, removals) require confirmation.
- After every code change, verify the servers still start and respond.

### V. Streaming Transparency

The SSE stream MUST surface what's happening: citation metadata before tokens, info
events for drugs looked up, warning events when nothing is found, error events with
codes on failure. The stream MUST terminate with `done` or `error` — never hang.

**Rationale:** Users cannot see the backend. The SSE events are the only window into
what APIs were called, what data was found, and whether the model is working. Silent
failures or hanging streams erode trust.

**Enforcement:**
- Every code path in `symptom_pipeline.run()` MUST yield a terminal event (`done` or `error`).
- `main.py` MUST wrap the pipeline in try/except that catches all exceptions and yields `error`.
- Frontend MUST handle `AbortError` by preserving partial text, not by showing an error.
- New SSE event types require updating both backend and frontend parsing in the same commit.

## Additional Constraints: Technology Stack & Security

**Technology:** The project uses FastAPI (Python 3.12+), Next.js 16 (TypeScript + Tailwind),
Ollama (`qwen2.5:7b`), and httpx for async HTTP. These constraints exist because the
user's environment (macOS, local Ollama) and preferences are fixed. Dependencies MUST
NOT be added without reason and confirmation.

**Security:**
- No API keys in tracked files. Tokens MUST be referenced via environment variables
  (e.g., `${GITHUB_TOKEN}` in `mcp.json`).
- `mcp.json` with token references is safe to commit; hardcoded tokens are not.
- `.env` files are already gitignored.
- CORS is restricted to `localhost:3000` and `127.0.0.1:3000` — never open to `*` in production.

**Performance:**
- Wikipedia search: max 3 articles per query, 800-char extracts, 2 retries.
- OpenFDA: max 4 concurrent drug queries, 3 retries with exponential backoff.
- Ollama: 120s total timeout, 32K context window via `qwen2.5:7b`.
- Prompt word budget: 4500 words (~6000 tokens) — warn when exceeded.
- Session store: 6-turn window, 30-minute TTL, in-memory only.
- Frontend: debounced localStorage writes (500ms during streaming, immediate flush on done).

## Development Workflow

**Code changes:**
1. Read the file before editing.
2. After Python changes: `find backend -type d -name __pycache__ -exec rm -rf {} + && cd backend && source .venv/bin/activate && python -c "compile('backend/*.py')"` or equivalent parse check.
3. After TypeScript changes: `npx tsc --noEmit` in `frontend/`.
4. Test by starting both servers and issuing a curl command:
   ```bash
   curl -N -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"query": "I have a headache and fever, what can I take?", "session_id": "test-1"}'
   ```
5. Verify the output contains `event: citation`, `event: token`, and `event: done`.
6. Verify the frontend at `http://localhost:3000` loads, sends messages, and renders citations.

**Git:**
- Commit messages MUST be descriptive, not generic.
- Co-authored-by: Claude <noreply@anthropic.com> on all commits.
- Push after meaningful units of work; squashing is optional.

**Spec-Kit:**
- Run `/speckit-specify` before starting new feature work.
- Run `/speckit-plan` after specification is approved.
- Run `/speckit-tasks` to break the plan into implementable tasks.
- Constitution compliance MUST be validated at each spec-kit stage.

## Governance

This constitution supersedes all other project guidance. Amendments require:
1. A documented proposal (can be conversational — "I think we should change X").
2. User approval (the user is the sole authority for this project).
3. Updating this file with a new version, ratification date, and Sync Impact Report.

Versioning follows Semantic Versioning:
- **MAJOR:** Principle removal or redefinition that changes project direction.
- **MINOR:** New principle added or existing one materially expanded.
- **PATCH:** Clarifications, wording fixes, non-semantic updates.

**Version**: 1.0.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-06-18
