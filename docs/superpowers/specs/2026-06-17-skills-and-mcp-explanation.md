# Skills & MCP Servers: What Was Used and Why

**Date:** 2026-06-17
**For:** Medical Citation Chatbot Project

---

## Part 1: Skills Used During Frontend Design

### 1. Brainstorming (`superpowers:brainstorming`)

**What it does:** Turns ideas into fully-formed designs through structured collaborative dialogue. Explores project context, asks clarifying questions one at a time, proposes approaches with trade-offs, presents designs for incremental approval, and writes a formal spec document.

**Why I used it for this step:** The user asked to design the frontend first ("start with the front end first, the UI should be clean and aesthetic"). Without a design phase, we'd risk building the wrong interface and having to redo it. This skill enforced:
- One question at a time (visual style → layout → citations → streaming behavior → conversation features)
- Visual companion for mockups so the user could see the UI, not just read about it
- Incremental approval of each decision before moving to the next
- Formal spec document that locks the design before any code is written

**When to use in later phases:** Any time you add a new feature or change the UI before coding it.

---

### 2. UI/UX Pro Max (`ui-ux-pro-max`)

**What it does:** Design intelligence for web interfaces — 50+ styles, 161 color palettes, 57 font pairings, UX guidelines across 10 stacks including React, Next.js, and Tailwind. Covers buttons, modals, navbars, cards, tables, forms, and charts.

**Why I used it for this step:** The user explicitly requested it: "use the ui-ux-promax plugin." More specifically:
- The "Warm Wellness" style with teal+amber palette, rounded shapes, and pill elements was chosen from the design vocabulary this skill provides
- The clinical-yet-approachable tone matches medical UX guidelines in the skill
- Color contrast ratios for accessibility (teal on white, warm-gray on cream) are informed by the skill's accessibility standards
- The component patterns (pill badges, ghost status bubbles, auto-expand textarea) follow the skill's catalog of proven UI patterns

**When to use in later phases:** During Phase 4 implementation — when actually building the React components, this skill provides Tailwind patterns, hover states, and responsive breakpoint guidance.

---

### 3. Caveman (`caveman`)

**What it does:** Ultra-compressed communication mode that cuts token usage ~75% while keeping full technical accuracy. Has intensity levels (lite, full, ultra).

**Why it's available but NOT used for this session:** The user did not request compressed output. Caveman is useful for long, token-heavy sessions where cost matters. During brainstorming, full descriptive communication is better — mockups and explanations need detail. This skill becomes valuable during implementation (Phases 1-4) when reading and writing large amounts of code.

**When to use in later phases:** If the session gets long during implementation, `/caveman` can reduce token costs while keeping code generation accurate.

---

## Part 2: MCP Servers

### Context7 (`context7`)

**What it does:** Retrieves up-to-date documentation and code examples for programming libraries and frameworks directly from official sources. Uses a two-step process: resolve library ID → query documentation.

**Why it's available in this session:** It was already configured before this project started. During implementation, I can use it to look up:
- FastAPI SSE streaming patterns
- Next.js App Router patterns
- httpx async client usage
- Tailwind CSS configuration

**Why I did NOT use it during this step:** The brainstorming/design phase doesn't need code documentation — it needs design decisions. Context7 becomes essential during Phase 1-4 when we actually write code.

**When to use in later phases:**
- Phase 1: "How to stream SSE from FastAPI" → query FastAPI docs
- Phase 2: "How to use httpx.AsyncClient with timeout" → query httpx docs
- Phase 4: "How to use ReadableStream in React" → query React/Next.js docs

---

### MCP Servers NOT Needed (and Why)

#### Puppeteer MCP
**What it does:** Controls a headless Chrome browser — navigate, click, screenshot, extract content.

**Why NOT needed:** The frontend testing described in the spec uses Vitest + MSW (mocked SSE endpoint), not real browser automation. Puppeteer would be useful for automated end-to-end screenshot tests AFTER Phase 4 is complete — but that's a nice-to-have, not a requirement for v1. Install it only if you want automated visual regression testing later.

#### Fetch / Web Search MCP
**What it does:** Makes raw HTTP requests and web searches with fewer restrictions than built-in tools.

**Why NOT needed:** Claude Code already has `WebFetch` (fetch any URL) and `WebSearch` (web search) built in. Adding this MCP would be 100% redundant — it does the same thing through a different wrapper. Also, the project's backend calls Wikipedia and OpenFDA via Python's `httpx` at runtime — Claude Code doesn't need to call them during development beyond verifying they work (which `curl` via Bash can do).

---

## Part 3: Project-Specific Skill

### medical-rag (Created for This Project)

**What it does:** A project-scoped skill stored at `.claude/skills/medical-rag/SKILL.md`. It encodes the architectural rules of this project and loads automatically whenever Claude Code works in the `Medical_Citation_Chatbot` directory.

**Rules it enforces:**
- Always use FastAPI (not Flask/Django)
- Always use Next.js + React + Tailwind (not Vue/Svelte)
- Always use live Wikipedia/OpenFDA APIs (no ChromaDB, FAISS, or any local vector database)
- Always use Ollama with `medgemma1.5:4b-it-q4_K_M` (no cloud LLM APIs)
- SSE for streaming (not WebSockets)
- `httpx.AsyncClient` for all outbound HTTP
- `[[CITATION:N]]` format for citations
- `asyncio.gather()` for concurrent API calls
- Proper error handling: every external call has timeout, never crashes the caller
- Supabase Auth for user authentication, PostgreSQL for session/message persistence

**Why needed:** Without this skill, Claude Code might suggest using ChromaDB for retrieval (which is the default RAG pattern in most codebases), or Flask (which is more common in Python tutorials), or OpenAI's API (which is the default LLM choice). The skill prevents these architectural violations before they happen.

**How it works:** The skill file is in the project directory under `.claude/skills/medical-rag/SKILL.md`. Claude Code detects it on session start and loads it into the system prompt. Any code suggestions are then filtered through these rules.

---

## Part 4: Tools Used During Development

| Tool | Type | Used? | Purpose |
|------|------|-------|---------|
| `medical-rag` | Skill (project) | ✅ Yes | Enforces architectural constraints on every session |
| `medical-rag-builder` | Agent | ✅ Yes | Subagents for parallel implementation (sonnet) + adversarial review (opus) |
| GitHub MCP | MCP | ✅ Yes | Issue/PR management via `.claude/mcp.json` |
| Spec-Kit (11 skills) | Skills | ✅ Yes | Spec-driven development: specify, plan, implement, tasks, clarify, converge, etc. |
| Context7 | MCP | Available | Up-to-date library docs (FastAPI, httpx, Next.js, Supabase) |

### Spec-Kit Skills Installed

| Skill | Purpose |
|-------|---------|
| `speckit-specify` | Create/update feature specifications |
| `speckit-plan` | Create implementation plans |
| `speckit-implement` | Execute implementation tasks |
| `speckit-tasks` | Generate task breakdowns |
| `speckit-clarify` | Clarify ambiguous requirements |
| `speckit-converge` | Converge on decisions |
| `speckit-constitution` | Project constitution/principles |
| `speckit-checklist` | Verification checklists |
| `speckit-analyze` | Analyze specifications |
| `speckit-taskstoissues` | Convert tasks to GitHub issues |
| `speckit-agent-context-update` | Update agent context |
