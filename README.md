# 🩺 Medical Chatbot — Generative RAG

A generative RAG chatbot that retrieves live data from **Wikipedia** and **OpenFDA**, feeds it to a local **qwen2.5:7b** model via **Ollama**, and streams cited responses to a React frontend. No hardcoded prompts, no keyword classifiers — the LLM handles everything generatively.

## How It Works

1. User asks any medical question (e.g. *"explain about paracetamol and I took glucosamine and now I have a rash"*)
2. Backend searches Wikipedia for the full query, extracts plain-text intros
3. Drug names are extracted heuristically from the query and Wikipedia text (no keyword lists)
4. OpenFDA is queried concurrently for each drug — both Rx and OTC label fields are extracted
5. A minimal prompt is built: context + "answer the question, cite sources, include disclaimer" — no hardcoded behavior rules
6. qwen2.5:7b streams a response token-by-token via **Server-Sent Events (SSE)**
7. Frontend renders streaming text with `[[CITATION:N]]` markers as clickable inline `[Wikipedia ↗]` / `[FDA ↗]` tags

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | FastAPI + Python 3.12 |
| **Streaming** | Server-Sent Events (SSE) over HTTP |
| **LLM** | qwen2.5:7b via Ollama (local, offline) |
| **Data Sources** | Wikipedia (MediaWiki API), OpenFDA Drug Label |
| **HTTP Client** | httpx (async) |

## Project Structure

```
Medical_Citation_Chatbot/
├── backend/
│   ├── main.py                  # FastAPI server, route dispatch
│   ├── symptom_pipeline.py      # Full pipeline: wiki → drug extract → OpenFDA → LLM → citations
│   ├── wiki_client.py           # MediaWiki API: search articles, get extracts
│   ├── openfda_client.py        # OpenFDA drug/label: OTC + Rx field extraction, DailyMed links
│   ├── rxnav_client.py          # RxNorm client (unwired — kept for reference)
│   ├── config.py                # Centralised config (all endpoints, timeouts, model)
│   ├── retry.py                 # Shared HTTP retry with Retry-After parsing
│   ├── session_store.py         # In-memory conversation history (6-turn, 30-min TTL)
│   ├── logging_setup.py         # Structured logging with request-ID injection
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js App Router (layout, page, globals.css)
│   ├── components/              # ChatContainer, MessageBubble, InlineCitation, CitationPill, Sidebar, …
│   ├── hooks/                   # useChatController, useChatStream, useChatReducer, useScrollManager, …
│   ├── lib/                     # TypeScript types, constants, utilities
│   └── package.json
├── .claude/
│   ├── skills/medical-rag/      # Project-scoped Claude Code skill
│   └── agents/                  # Agent definitions
├── spec.md                      # System specification (this is the definitive doc)
├── plan.md                      # Development plan + design decisions + roadmap
├── README.md                    # This file
└── CLAUDE.md                    # Claude Code instructions
```

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **Ollama** installed and running locally

### 1. Setup Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Pull the model
ollama pull qwen2.5:7b
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

### 3. Run

Terminal 1 — Backend server:
```bash
cd backend
source .venv/bin/activate
cd .. && PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
```

Terminal 2 — Frontend dev server:
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Quick Test

```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "I have a bad headache and fever, what can I take?", "session_id": "test-1"}'
```

## Features

- 🏥 **Live medical data** — Wikipedia condition info + FDA drug labels (Rx + OTC fields)
- 🤖 **Fully generative** — No hardcoded prompts, no keyword lists, no query classifier
- 📎 **Clickable citations** — `[[CITATION:N]]` rendered as `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) inline tags
- ⚡ **Token-by-token streaming** — Responses appear as they're generated
- 🧠 **Local model** — qwen2.5:7b runs entirely on your machine via Ollama
- 📝 **Conversation history** — 6-turn memory with 30-minute session TTL
- 🛑 **Cancel during streaming** — Stop generation mid-response, keep partial text
- 📱 **Responsive** — Collapsible sidebar, mobile-friendly layout
- 🎨 **Warm Wellness design** — Clean, calming color palette
- ♿ **Keyboard accessible** — Sidebar session items are `<button>` elements with aria labels

## SSE Wire Format

```
event: citation
data: {"index": 1, "url": "https://en.wikipedia.org/wiki/Paracetamol", "title": "Paracetamol", "source": "wikipedia"}

event: citation
data: {"index": 2, "url": "https://dailymed.nlm.nih.gov/...", "title": "FDA Label: acetaminophen", "source": "fda"}

event: info
data: {"message": "Looked up information on: paracetamol, glucosamine"}

event: token
data: {"text": "Paracetamol"}

event: token
data: {"text": " may"}

... (more tokens)

event: done
data: {"full_text": "Paracetamol may help...", "citations": [{"index": 2, ...}]}

event: error
data: {"message": "...", "code": "TIMEOUT"}

event: warning
data: {"message": "Limited medical information found. Please see a doctor."}
```

## APIs Used

| API | Purpose | Auth |
|-----|---------|------|
| **MediaWiki (Wikipedia)** | Condition & treatment articles, plain-text extracts | None (User-Agent required) |
| **OpenFDA drug/label** | FDA-approved drug labels: indications, warnings, side effects, dosage | None |
| **Ollama** | Local LLM inference via `/api/generate` with streaming | None |

RxNav/RxNorm client exists (`backend/rxnav_client.py`) but is not wired into the pipeline — heuristic drug name extraction proved sufficient.

All APIs are free with no API key required.

## Documentation

- **[spec.md](spec.md)** — Definitive system specification (architecture, pipeline, SSE wire format, error handling)
- **[plan.md](plan.md)** — Development plan, design decisions, roadmap, deleted modules
- **[.claude/skills/medical-rag/SKILL.md](.claude/skills/medical-rag/SKILL.md)** — Claude Code skill instructions

## License

