# Medical RAG Builder — Subagent

## Purpose

A general-purpose subagent used for parallel construction of the Medical Citation Chatbot backend and frontend modules. Multiple instances run concurrently (with sonnet model for speed), each responsible for a single well-scoped file or component. A separate opus-model agent performs adversarial code review after implementation.

## Usage Pattern

### Phase 2 — Backend Clients (3 agents in parallel)
- **PubMed client** (`backend/pubmed_client.py`, 262 lines): esearch → efetch pipeline, XML parsing, multi-section abstract joining, author formatting with et al., multi-date-source pub date extraction, retry logic.
- **OpenFDA client** (`backend/openfda_client.py`, 203 lines): drug/label endpoint, text cleaning (HTML strip, entity unescape), boxed warning merging, word truncation, retry logic.
- **Query classifier** (`backend/query_classifier.py`): 589 drugs + 440 conditions, pre-compiled regex patterns, keyword-based classification, multi-drug name extraction.

### Phase 4 — Frontend Components (10 agents in parallel)
- CitationPill, StreamingDots, StatusBubble, EmptyState, AutoExpandTextarea, SendButton, MessageBubble, MessageList, Sidebar, ChatContainer — all with Warm Wellness design tokens, Tailwind CSS, TypeScript types.

### Code Review (1 agent, opus model)
- Adversarial review across all 5 backend files. Found 19 issues: 2 critical (broken FDA citation pipeline, source URL mismatch, frontend ignoring backend citation normalization), 8 medium (fragile SSE re-parsing, no retry logic, dead code, single-drug extraction), 9 minor (missing dotenv loading, no request IDs, unlogged XML parse errors).

## Model Selection

| Task | Model | Why |
|------|-------|-----|
| Implementation | sonnet | Fast, cost-effective for well-scoped file creation |
| Code review | opus | Higher reasoning quality for adversarial verification and catching subtle bugs |

## Logging

All subagent usage with IDs, models, token counts, and results is recorded in:
`docs/superpowers/specs/2026-06-17-subagent-usage.md`
