# 🩺 Medical Chatbot — Generative RAG

A generative RAG chatbot that retrieves live data from **Wikipedia** and **OpenFDA**, feeds it to a local **qwen2.5:7b** model via **Ollama**, and streams cited responses to a React frontend. **Supabase** provides authentication and persistent session storage. No hardcoded prompts, no keyword classifiers — the LLM handles everything generatively.

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
| **Auth** | Supabase Auth (JWT) + python-jose verification |
| **Database** | Supabase PostgreSQL (sessions, messages) |

## Project Structure

```
Medical_Citation_Chatbot/
├── backend/
│   ├── main.py                  # FastAPI server, SSE streaming route, shutdown hooks
│   ├── symptom_pipeline.py      # Full pipeline: wiki → drug extract → OpenFDA → LLM → citations
│   ├── wiki_client.py           # MediaWiki API: search articles, get extracts
│   ├── openfda_client.py        # OpenFDA drug/label: OTC + Rx field extraction, DailyMed links
│   ├── config.py                # Centralised config + load_dotenv
│   ├── retry.py                 # Shared HTTP retry with Retry-After parsing
│   ├── session_store.py         # Supabase-backed session/message persistence
│   ├── auth.py                  # JWT verification (python-jose)
│   ├── supabase_client.py       # Supabase client singleton
│   ├── logging_setup.py         # Structured logging with request-ID injection
│   ├── routers/
│   │   └── session_routes.py    # Session CRUD API (auth-protected)
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (AuthProvider wraps all)
│   │   ├── page.tsx             # Main chat page (auth-protected)
│   │   ├── login/page.tsx       # Login page
│   │   ├── register/page.tsx    # Register page
│   │   └── globals.css          # Tailwind + custom color tokens
│   ├── components/              # ChatContainer, MessageBubble, Sidebar, AuthProvider, …
│   ├── hooks/                   # useChatController, useChatStream, useAuth, useSessionStore, …
│   ├── lib/                     # types, constants, utils, supabase client, api wrapper
│   └── package.json
├── .claude/
│   ├── skills/medical-rag/      # Project-scoped Claude Code skill
│   └── agents/                  # Subagent definitions
├── docs/                        # Development documentation and specs
├── plan/                        # Plans with phases
├── slides/                      # Pitch deck (Marp)
├── spec.md                      # System specification
├── report.md                    # Project report
├── README.md                    # This file
└── CLAUDE.md                    # Claude Code instructions
```

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **Ollama** installed and running locally
- **Supabase project** (free tier at [supabase.com](https://supabase.com))

### 1. Setup Supabase

Create a Supabase project and run this SQL in the SQL Editor:

```sql
-- Profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- Chat sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations_json jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index idx_chat_sessions_user_id on chat_sessions(user_id);
create index idx_messages_session_id on messages(session_id);

-- RLS policies
alter table profiles enable row level security;
alter table chat_sessions enable row level security;
alter table messages enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can view own sessions" on chat_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions" on chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on chat_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on chat_sessions for delete using (auth.uid() = user_id);

create policy "Users can view own messages" on messages for select using (
  exists (select 1 from chat_sessions where chat_sessions.id = messages.session_id and chat_sessions.user_id = auth.uid())
);
create policy "Users can create own messages" on messages for insert with check (
  exists (select 1 from chat_sessions where chat_sessions.id = messages.session_id and chat_sessions.user_id = auth.uid())
);
```

### 2. Setup Environment Variables

**Backend** — create `backend/.env`:
```bash
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-anon-key>
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

**Frontend** — create `frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Find these values in your Supabase dashboard: **Settings → API**.

### 3. Setup Backend

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

### 4. Setup Frontend

```bash
cd frontend
npm install
```

### 5. Run

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

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login` to register or sign in.

## Features

- 🏥 **Live medical data** — Wikipedia condition info + FDA drug labels (Rx + OTC fields)
- 🤖 **Fully generative** — No hardcoded prompts, no keyword lists, no query classifier
- 📎 **Clickable citations** — `[[CITATION:N]]` rendered as `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) inline tags
- ⚡ **Token-by-token streaming** — Responses appear as they're generated
- 🧠 **Local model** — qwen2.5:7b runs entirely on your machine via Ollama
- 🔐 **User authentication** — Supabase Auth with JWT tokens, login/register pages
- 💾 **Persistent sessions** — Chat history stored in Supabase PostgreSQL, survives restarts
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
| **Supabase** | User auth (JWT), session/message storage (PostgreSQL) | Anon key + JWT secret |

All external APIs are free. Supabase free tier: 500MB DB, 50K monthly active users.

## Documentation

- **[spec.md](spec.md)** — Definitive system specification (architecture, pipeline, SSE wire format, error handling)
- **[plan/project-overview/](plan/project-overview/)** — Development plan, phases, design decisions
- **[.claude/skills/medical-rag/SKILL.md](.claude/skills/medical-rag/SKILL.md)** — Claude Code skill instructions

## License

