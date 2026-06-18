<!-- ch-3 personal-project report. Copy this file to ch-3/<your-github-username>/report.md -->
# ch-3 Personal Project — Report

github_username: <your-github-login>
personal_repo_url: https://github.com/<you>/Medical_Citation_Chatbot
project_summary: Agentic RAG chatbot that suggests OTC medications for user-described symptoms. Retrieves live data from Wikipedia Medical, OpenFDA, and RxNorm APIs, feeds it to a local qwen2.5:7b model via Ollama, and streams cited medication recommendations with strong medical disclaimers to a React frontend.
slides_url: <Marp source path in your repo, e.g. slides/pitch.md, OR a rendered link>

## Methodology
<!-- How you worked: project-based approach + your project workflow (commit as you build). 2-4 sentences. -->

I followed a phased development approach (environment setup → backend foundation → live data integration → RAG fusion → frontend). Each phase was implemented using Claude Code with subagent-driven development — subagents handled parallel work (API clients for Wikipedia Medical, OpenFDA, and RxNav/RxNorm, query classifier, frontend components) while an Opus reviewer adversarially verified correctness. The project uses a scoped Claude Code skill (`.claude/skills/medical-rag/SKILL.md`) to enforce the tech stack (FastAPI + Next.js + Ollama + live APIs only, no vector databases) across all development sessions. The pipeline evolved from PubMed literature search to a symptom→medication recommendation system with mandatory medical disclaimers.

## Evidence — Claude Code usage
<!-- List the ACTUAL paths in your personal repo. The validator checks these exist. -->

### MCP
- path: .mcp.json
- what: Context7 MCP server — used to query live documentation for FastAPI, httpx, Next.js, Tailwind CSS, React, and NCBI E-utilities during development. Resolved library IDs and retrieved code examples for API integration patterns.

### Skill
- path: .claude/skills/medical-rag/SKILL.md
- what: Project-scoped skill enforcing architectural constraints — FastAPI backend, Next.js + React + Tailwind frontend, local Ollama (qwen2.5:7b), Wikipedia Medical + OpenFDA + RxNav/RxNorm live APIs only. Forbids Flask, Django, WebSockets, ChromaDB, FAISS, cloud LLMs, and any local vector store. Enforces SSE wire format, `[[CITATION:N]]` citation markers rendered as clickable inline superscripts, `httpx.AsyncClient` usage, and concurrent API calls via `asyncio.gather()`. Pipeline: symptoms → Wikipedia (condition info) + OpenFDA (drug labels) → RxNav (drug normalisation) → LLM (medication recommendation + doctor disclaimer).

### Agent
- path: .claude/agents/medical-rag-builder.md
- what: General-purpose subagents used for parallel development across API clients and frontend components. Sonnet-model agents built Wikipedia Medical client, OpenFDA client with OTC + Rx field extraction, RxNav/RxNorm client for drug name normalisation, and all React components concurrently. A Sonnet agent performed adversarial code review across all 5 backend files, catching 19 issues (2 critical: broken FDA citation pipeline and source URL mismatch, 8 medium, 9 minor). Later subagents diagnosed Wikipedia 403 errors (missing User-Agent), RxNav endpoint bugs, and OTC drug field extraction gaps. The pipeline was redesigned from PubMed literature search to symptom→medication recommendation. All usage with model selection rationale and token counts is logged in docs/superpowers/specs/2026-06-17-subagent-usage.md.
