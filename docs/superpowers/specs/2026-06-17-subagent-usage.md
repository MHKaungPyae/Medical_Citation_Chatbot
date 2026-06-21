# Subagent Usage Log: Medical Citation Chatbot

**Last Updated:** 2026-06-17
**Status:** Historical record — documents development phases from 2026-06-17. Some referenced files (PubMed client, query classifier) were later deleted and replaced by Wikipedia + heuristic drug extraction. See `.claude/agents/medical-rag-builder.md` for current agent definition.

---

## What Are Subagents?

Subagents are separate Claude Code instances spawned to do independent tasks concurrently. They each get their own context window, work in parallel, and return only the result. This breaks a sequential task ("do A, then B, then C") into parallel work ("do A, B, and C at the same time"), cutting wall-clock time significantly.

---

## Phase 2: Live Medical Data Integration (3 Subagents)

**Date:** 2026-06-17
**Model:** Sonnet (`sonnet`) — efficient for mechanical code generation tasks (REST clients, keyword matching)
**Subagent type:** `general-purpose`
**Run mode:** `run_in_background: true` (all 3 launched simultaneously)

### Why Subagents Here?

Phase 2 has 3 files that are **truly independent**:
- `pubmed_client.py` doesn't need `openfda_client.py`
- `openfda_client.py` doesn't need `pubmed_client.py`
- `query_classifier.py` doesn't need either

No shared state, no sequential dependencies, no order requirements. They can (and should) be built in parallel.

### Why Sonnet Instead of Opus?

| Factor | Sonnet | Opus |
|--------|--------|------|
| **Task type** | REST API clients + keyword matching | Deep architecture design |
| **Complexity** | Mechanical — call API, parse, handle errors | High — novel design decisions |
| **Speed** | Fast output | Slower, more deliberative |
| **Cost** | Lower tokens | Higher tokens |
| **Fit for Phase 2** | ✅ Perfect | ❌ Overkill |

Sonnet writes clean `httpx` wrappers and keyword lists efficiently. Opus is reserved for Phase 3 prompt engineering (where the architecture of combining live data + LLM context matters) and debugging hard problems.

### Subagent 1: PubMed Client ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `acec91b468414ba54` |
| **Model** | Sonnet |
| **Target File** | `backend/pubmed_client.py` (262 lines) |
| **Task** | NCBI E-utilities API wrapper — esearch → efetch pipeline, XML parsing |
| **Return** | `async def search_pubmed(query, max_results=3) -> list[dict]` |
| **Status** | ✅ Completed — 68s, 27,299 tokens |
| **Quality** | Multi-date-source parsing, et al. author handling, multi-section abstract support, proper error handling |

### Subagent 2: OpenFDA Client ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `a4cd86acd06dd46ba` |
| **Model** | Sonnet |
| **Target File** | `backend/openfda_client.py` (203 lines) |
| **Task** | OpenFDA Drug Label API wrapper — drug/label endpoint, text cleaning |
| **Return** | `async def search_openfda(drug_name) -> dict` |
| **Status** | ✅ Completed — 33s, 19,729 tokens |
| **Quality** | Boxed warning merging, HTML entity unescaping, word-boundary truncation, clean error handling |

### Subagent 3: Query Classifier ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `af72f3ce66e732484` |
| **Model** | Sonnet |
| **Target File** | `backend/query_classifier.py` (390 drugs, 280 conditions) |
| **Task** | Keyword-based query classification with word-boundary regex |
| **Return** | `def classify_query(query) -> dict` with type, search_pubmed, search_openfda |
| **Status** | ✅ Completed — 123s, 42,095 tokens |
| **Quality** | `re.escape()` for compound keywords, pre-compiled patterns at import, doctest-ready |
| **Note** | Drug-only queries return `type="drug"` which still searches both APIs — functionally identical to `"both"` |

### Phase 2 Parallel Efficiency

| Metric | Value |
|--------|-------|
| **Wall-clock time** | 123s (slowest agent) |
| **Sequential equivalent** | ~224s (68+33+123) |
| **Time saved** | ~45% |
| **Total tokens** | 89,123 across 3 agents |
| **Files produced** | 3 files, ~800 lines total |

---

## When to Use Subagents vs Sequential Work

| Use Subagents When | Don't Use When |
|-------------------|----------------|
| Tasks share no state or files | Task B depends on task A's output |
| Each task is self-contained | Tasks modify the same file |
| Wall-clock time matters | The task is trivial (one file, <50 lines) |
| Tasks can be described in one prompt | The task needs interactive feedback |

---

## Subagent Usage Summary

| Phase | What Was Parallelized | Model | Status |
|-------|----------------------|-------|--------|
| Phase 2 | PubMed client + OpenFDA client + Query classifier | Sonnet | ✅ Completed (PubMed + classifier later deleted, replaced by Wikipedia + heuristic extraction) |
| Phase 3 tests | 3 test agents + 1 code review | Sonnet + Opus | ✅ Completed |
| Code Review | Adversarial review of backend files | Opus | ✅ Completed |

---

## Phase 3 Testing & Code Review (4 Subagents)

**Date:** 2026-06-17
**Models:** 3 × Sonnet (tests) + 1 × Opus (code review)

### Subagent 1: Test PubMed Client ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `a063c589c803fd470` |
| **Model** | Sonnet |
| **Task** | Run live API calls against NCBI E-utilities, verify 6 required keys, test empty query |
| **Status** | ⚠️ Agent blocked by bash permission — tests run by main thread instead |
| **Result** | **PASSED** — 3 articles returned, all 6 required keys present, empty query returns `[]`. Root cause: stale `__pycache__/` from old server process caused earlier failures. Fix: clear pycache before every server restart. |

### Subagent 2: Test OpenFDA Client ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `a5e791696bdd60c5b` |
| **Model** | Sonnet |
| **Task** | Run live API calls against OpenFDA drug/label, test aspirin, metformin, nonexistent drug |
| **Status** | ⚠️ Agent blocked by bash permission — tests run by main thread instead |
| **Result** | **PASSED** — aspirin returns indications/warnings/side_effects, metformin found, nonexistent drug returns `not_found`. All required keys present. |

### Subagent 3: Test Query Classifier ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `a0a2e075ce6995d6a` |
| **Model** | Sonnet |
| **Task** | Run 13 classification tests + verify keyword counts (200 drugs, 100 conditions) |
| **Status** | ⚠️ Agent blocked by bash permission — tests run by main thread instead |
| **Result** | **ALL 13 TESTS PASSED** — 589 drugs, 440 conditions, correct classification for drug/condition/both/non_medical queries. `extract_drug_name` works correctly. |

### Subagent 4: Code Review ✅

| Property | Value |
|----------|-------|
| **Agent ID** | `adea17b0f63c4aaff` |
| **Model** | **Opus** |
| **Task** | Deep review of backend files — bugs, edge cases, code quality, security |
| **Status** | ✅ Completed |

### Lessons Learned

1. **`__pycache__` kills E2E tests**: When editing code and restarting uvicorn, always clear `__pycache__/` directories. The server loads modules at startup and caches them; a restart without clearing pycache runs old code. FIX: clear `__pycache__/` before every server restart during development.

2. **Subagents can't run bash tests**: Background subagents hit permission prompts for Bash commands. The main session thread can run them freely. For testing, either: (a) run tests from the main thread while subagents do code review, or (b) grant project-level bash permissions.

3. **URL encoding matters**: Both PubMed (`quote()`) and OpenFDA (`+` not `%2B`) have specific encoding requirements. PubMed needs the query URL-encoded. OpenFDA needs literal `+` signs between search terms.
