<!-- ch-3 personal-project report. Copy this file to ch-3/<your-github-username>/report.md -->
# ch-3 Personal Project — Report

github_username: mhkaungpyae
personal_repo_url: https://github.com/mhkaungpyae/Medical_Citation_Chatbot
project_summary: Generative RAG chatbot that answers any medical question using live data from Wikipedia and OpenFDA APIs, fed to a local qwen2.5:7b model via Ollama, streamed to a Next.js frontend with clickable citations and medical disclaimers.
slides_url: slides/pitch.md

## Methodology

I followed a phased development approach (environment setup → backend foundation → live data integration → RAG fusion → frontend). Each phase was implemented using Claude Code with subagent-driven development — subagents handled parallel work (API clients for Wikipedia and OpenFDA, frontend components) while adversarial review verified correctness. The project uses a scoped Claude Code skill (`.claude/skills/medical-rag/SKILL.md`) to enforce the tech stack (FastAPI + Next.js + Ollama + live APIs only, no vector databases) across all development sessions. The pipeline evolved from a PubMed literature search through a keyword-classified symptom→medication recommender, and ultimately to a fully generative RAG system — no hardcoded prompts, no keyword lists, no query classifier. The LLM itself decides how to answer based on retrieved context.

## Evidence — Claude Code usage

### MCP
- path: .claude/mcp.json
- what: GitHub MCP server (`@modelcontextprotocol/server-github`) using `${GITHUB_TOKEN}` env var for authentication. Provides tools for GitHub issue/PR management directly from Claude Code. GitHub Spec-Kit (`specify` CLI) installed with slash commands for spec-driven development (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, etc.).

### Skill
- path: .claude/skills/medical-rag/SKILL.md
- what: Project-scoped skill enforcing architectural constraints — FastAPI backend, Next.js + React + Tailwind frontend, local Ollama (qwen2.5:7b), Wikipedia MediaWiki + OpenFDA Drug Label live APIs only. Forbids hardcoded system prompts, keyword classifiers, drug lists, Flask, Django, WebSockets, ChromaDB, FAISS, cloud LLMs, and any local vector store. Enforces SSE wire format (6 event types: token, citation, done, error, warning, info), `[[CITATION:N]]` markers rendered as clickable `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) inline tags, and concurrent API calls via `asyncio.gather()`. Pipeline: any query → Wikipedia (raw search) + drug extraction (heuristic) → OpenFDA (concurrent) → minimal prompt ("answer helpfully, cite sources, include disclaimer") → qwen2.5:7b streaming response.

### Agent
- path: .claude/agents/medical-rag-builder.md
- what: General-purpose subagents used for parallel development across API clients and frontend components. Sonnet-model agents built Wikipedia Medical client, OpenFDA client with OTC + Rx field extraction, RxNav/RxNorm client (later unwired — heuristic drug extraction proved sufficient), and all React components concurrently. An Opus agent performed adversarial code review across all backend files, catching issues including broken FDA citation pipeline, double retry nesting, and session bootstrap race conditions. Later subagents diagnosed Wikipedia 403 errors (missing User-Agent) and RxNav endpoint bugs. The pipeline was redesigned twice: first from PubMed literature search to symptom→medication classifier, then to a fully generative RAG system after removing all hardcoded prompts, keyword classifiers, and drug/condition lists. All usage with model selection rationale and token counts is logged in docs/superpowers/specs/2026-06-17-subagent-usage.md.
