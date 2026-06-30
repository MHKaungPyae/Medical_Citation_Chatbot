---
marp: true
theme: default
paginate: true
transition: fade
---

<!-- _class: lead -->

# Medical Citation Chatbot

**AI-powered medical answers with real, clickable citations.**

**Live:** medical-citation-chatbot.vercel.app · **Repo:** github.com/mhkaungpyae/Medical_Citation_Chatbot

---

# The Problem

**Google gives links. ChatGPT gives hallucinations. Neither gives citations.**

- Medical information changes — FDA labels update, guidelines evolve
- AI models can't distinguish current facts from outdated training data
- Most chatbots reject medical questions or answer without sources

People need answers that are **explainable, sourced, and trustworthy**.

---

# What It Does

A generative RAG chatbot that answers **any** medical question using live data.

1. User asks a question (e.g. "Can I take paracetamol with glucosamine?")
2. Wikipedia articles are retrieved and plain-text extracts are fetched
3. Drug names are extracted heuristically from the query and Wikipedia text
4. OpenFDA drug labels are searched concurrently for each drug
5. A local LLM (MedGemma) streams a response with inline citations
6. Every claim links back to **[Wikipedia ↗]** or **[FDA ↗]** sources

No keyword classifiers. No hardcoded prompts. The model decides how to answer.

---

# How It Works

```
User → Vercel (Next.js) → Render (FastAPI) → Wikipedia / OpenFDA / ngrok → Ollama
              ↕                    ↕
        Supabase Auth        Supabase PostgreSQL
        (JWT tokens)         (sessions + messages)
```

**Stack:** FastAPI · Next.js 16 · Ollama (medgemma1.5:4b-it-q8_0) · Supabase · TypeScript · Tailwind CSS

**Deployment:**
- **Frontend:** Vercel — `medical-citation-chatbot.vercel.app`
- **Backend:** Render — `medical-citation-chatbot.onrender.com`
- **LLM tunnel:** ngrok — `petri-vastly-reclining.ngrok-free.dev` → local Ollama

**Data sources:** Wikipedia MediaWiki API (free, no key) + OpenFDA Drug Label API (free, no key)

---

# Citation System

Every response includes **clickable inline citations**:

- **[Wikipedia ↗]** (teal) — links to the Wikipedia article used
- **[FDA ↗]** (amber) — links to the FDA drug label or DailyMed page

Citations are rendered as badges inline within the response text, with rich citation pills below showing full source metadata.

Citation markers are normalised from multiple formats (`[1]`, `(1)`, `[[CITATION 1]]`) to a canonical `[[CITATION:N]]` format. Only citations actually used in the response are displayed.

---

# User Features

- **Authentication:** Supabase Auth with JWT — register, login, persistent sessions
- **Multi-session:** Create, switch, and delete conversation sessions
- **Chat history:** Messages persist in PostgreSQL across devices
- **Streaming responses:** Tokens stream in real-time via Server-Sent Events
- **Medical disclaimer:** Every response includes a disclaimer to see a doctor
- **Error handling:** Graceful fallbacks for timeouts, connection failures, and empty queries

---

# Architecture Highlights

- **No classifier:** Every query goes through the same pipeline — Wikipedia → drug extraction → OpenFDA → LLM
- **No hardcoded prompt:** Minimal context-only prompt with no system role or behavioural rules
- **Heuristic drug extraction:** 3-pass extraction (capitalised words, abbreviations, lowercase 4–15 char words) with stop-word filtering
- **Concurrent API calls:** OpenFDA searches run in parallel via `asyncio.gather()`
- **Resilient HTTP:** Shared retry helper with exponential backoff and `Retry-After` header parsing
- **Thinking token filter:** Strips MedGemma internal reasoning blocks from the output

---

# Why It Matters

1. **Real citations build trust** — every claim is traceable to Wikipedia or FDA
2. **Generative, not prescriptive** — adapts to any medical question naturally
3. **Local LLM, zero cost** — MedGemma runs on-device, data never leaves your machine
4. **Persistent accounts** — Supabase Auth + PostgreSQL for cross-device history
5. **Simplified over time** — started complex (PubMed, classifiers, 5+ modules), ended simple

---

<!-- _class: lead -->

# Try It Out

**Live app:** medical-citation-chatbot.vercel.app

**Backend API:** medical-citation-chatbot.onrender.com/api/health

**Repo:** github.com/mhkaungpyae/Medical_Citation_Chatbot

```bash
# Run locally
cd backend && source .venv/bin/activate
pip install -r requirements.txt
ollama pull medgemma1.5:4b-it-q8_0
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

cd frontend && npm install && npm run dev
```
