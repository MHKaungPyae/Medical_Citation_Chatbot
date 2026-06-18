# 🩺 Medical Chatbot — Symptom → Medication

An Agentic RAG chatbot that retrieves live data from **Wikipedia Medical**, **OpenFDA**, and **RxNorm** APIs, feeds it to a local **qwen2.5:7b** model via **Ollama**, and streams cited medication recommendations with strong medical disclaimers to a React frontend.

## How It Works

1. User describes their symptoms (e.g. *"I have a bad headache and fever, what can I take?"*)
2. Backend classifies the query, then concurrently searches Wikipedia (condition/treatment info) and OpenFDA (drug label data)
3. RxNorm normalises drug names and finds brand alternatives
4. Retrieved context is formatted and injected into a strict system prompt that **requires a doctor disclaimer**
5. qwen2.5:7b streams a response token-by-token via **Server-Sent Events (SSE)** — suggests the closest OTC medication, explains why, lists warnings
6. Frontend renders streaming text with `[[CITATION:N]]` markers as clickable inline superscript links to sources

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | FastAPI + Python 3.12 |
| **Streaming** | Server-Sent Events (SSE) over HTTP |
| **LLM** | qwen2.5:7b via Ollama (local, offline) |
| **Data Sources** | Wikipedia (MediaWiki API), OpenFDA Drug Label, RxNav/RxNorm |
| **HTTP Client** | httpx (async) |

## Project Structure

```
Medical_Citation_Chatbot/
├── backend/
│   ├── main.py                  # FastAPI server, route dispatch
│   ├── symptom_pipeline.py      # Full RAG: classify → wiki → OpenFDA → RxNav → LLM → citations
│   ├── wiki_client.py           # MediaWiki API: search medical articles, get extracts
│   ├── openfda_client.py        # OpenFDA drug/label: OTC + Rx field extraction, DailyMed links
│   ├── rxnav_client.py          # RxNorm: drug name → RxCUI, brand name lookup
│   ├── query_classifier.py      # Keyword-based query classification
│   ├── classifier_data.py       # 589 drug keywords + 440 medical condition keywords
│   ├── prompts.py               # System prompt, RAG prompt builder, context formatters
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
├── CLAUDE.md                    # Claude Code instructions
└── README.md                    # This file
```

## Getting Started

### Prerequisites

- **Python 3.12+** (with `venv`)
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

- 🏥 **Live medical data** — Wikipedia condition info + FDA drug labels + RxNorm drug normalisation
- 💊 **Symptom → medication** — Suggests closest OTC drug for your symptoms with mechanism explanation
- ⚠️ **Doctor disclaimer** — Every response strongly advises seeing a doctor
- 📎 **Clickable citations** — `[[CITATION:N]]` rendered as inline superscript links to Wikipedia/FDA sources
- ⚡ **Token-by-token streaming** — Responses appear as they're generated
- 🧠 **Local model** — qwen2.5:7b runs entirely on your machine via Ollama
- 📝 **Conversation history** — 6-turn memory with 30-minute session TTL
- ❌ **Non-medical guard** — Politely rejects off-topic questions without wasting API calls
- 🛑 **Cancel during streaming** — Stop generation mid-response
- 📱 **Responsive** — Collapsible sidebar, mobile-friendly layout
- 🎨 **Warm Wellness design** — Clean, calming color palette optimised for medical context

## SSE Wire Format

```
event: citation
data: {"index": 1, "url": "https://en.wikipedia.org/wiki/Paracetamol", "title": "Paracetamol", "source": "wikipedia"}

event: citation
data: {"index": 2, "url": "https://dailymed.nlm.nih.gov/...", "title": "FDA Label: acetaminophen", "source": "fda", "drug_name": "acetaminophen"}

event: info
data: {"message": "Looked up information on: acetaminophen, ibuprofen"}

event: token
data: {"text": "Paracetamol"}

event: token
data: {"text": " may"}

... (more tokens)

event: token
data: {"text": "."}

event: done
data: {"full_text": "Paracetamol may help...\n\n⚠️ This is not medical advice.", "citations": [{"index": 2, ...}]}

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
| **RxNav/RxNorm** | Drug name normalisation: generic → RxCUI, brand name lookup | None |
| **Ollama** | Local LLM inference via `/api/generate` with streaming | None |

All APIs are free with no API key required.

## License

MIT
