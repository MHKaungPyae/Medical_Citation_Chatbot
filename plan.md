# Development Plan: Medical Citation Web Chatbot

## Objective
Build an Agentic Web RAG chatbot using FastAPI, React, and local Ollama (`medgemma:4b-it`) that retrieves live data from the PubMed and OpenFDA APIs to provide hallucination-free, cited medical answers.

---

## Phase 0: Environment & Agent Setup
Before coding, configure your local environment and teach Claude Code the strict rules of this project using a custom Agent Skill.

- [ ] **Install Core Dependencies:** Ensure Python 3.10+, Node.js, and Ollama are installed on your MacBook.
- [ ] **Pull the Local Model:** Run `ollama pull medgemma:4b-it` in your terminal.
- [ ] **Register NCBI API Key:** Register at https://account.ncbi.nlm.nih.gov/ to get an API key. Store it in `.env` as `NCBI_API_KEY`. This raises the rate limit from 3 req/s to 10 req/s.
- [ ] **Create the Claude Code Skill:**
  - Create the directory: `.claude/skills/medical-rag/`
  - Create the file: `.claude/skills/medical-rag/SKILL.md`
  - Add the architectural rules: Instruct Claude that this project uses **FastAPI**, **React**, and **Live APIs (PubMed/OpenFDA)**, and explicitly forbid the use of local vector databases like ChromaDB.

## Phase 1: Local AI Engine (Backend Foundation)
Establish the basic communication between your Python backend and your local MacBook hardware.

- [ ] **Initialize FastAPI:** Create a minimal FastAPI server (`backend/main.py`) with CORS enabled for your future React frontend.
- [ ] **Connect to Ollama:** Write an asynchronous function using `httpx` to send a hardcoded prompt to `http://localhost:11434/api/generate`. Set `timeout=httpx.Timeout(60.0, connect=10.0)`.
- [ ] **Enable Streaming:** Configure the FastAPI route to yield the response token-by-token using Server-Sent Events (SSE).
- [ ] **Define SSE Wire Format:** Every event carries a JSON payload. Use exactly these three event types:
  - `event: token` → `data: {"text": "..."}`
  - `event: citation` → `data: {"index": 1, "url": "https://...", "title": "Paper Title", "snippet": "first 100 chars..."}`
  - `event: done` → `data: {"full_text": "...", "citations": [{"index":1, "url":"...", "title":"..."}]}`
  - Citations are streamed as separate events *before* the `done` event so the frontend can attach hyperlinks inline without parsing the text.
- [ ] **Error Handling:** Catch `httpx.TimeoutException` and `httpx.ConnectError` from Ollama; return an SSE `event: error` with a user-friendly message. Never leave the SSE connection hanging.
- [ ] **Test:** Use a `curl` command in the terminal to verify that MedGemma streams text back line-by-line via SSE, including a forced timeout test.

## Phase 2: Live Medical Data Integration (The Research Network)
Build the tools to fetch real medical facts from the web. **Do not use the AI model in this phase.**

- [ ] **Build the PubMed Client** (`backend/pubmed_client.py`):
  - Use the NCBI E-utilities API with the `NCBI_API_KEY` from `.env`.
  - Pipeline: `esearch` (get top 3 PMIDs) → `efetch` with `rettype=abstract&retmode=xml` (fetch full metadata).
  - Return `List[dict]` where each dict has: `pmid`, `title`, `snippet` (first 200 words of abstract, truncated with "…"), `url` (`https://pubmed.ncbi.nlm.nih.gov/{pmid}/`), `pub_date`, `authors` (first 3).
  - Set `httpx.Timeout(10.0, connect=5.0)`. Add 1-second delay between PubMed requests to respect rate limits.
  - On failure (timeout, 429, 5xx): return an empty list — never crash the caller. Log the error with `logging.warning()`.
- [ ] **Build the OpenFDA Client** (`backend/openfda_client.py`):
  - Use the `/drug/label` endpoint (official prescribing info), NOT `/drug/event` (noisy FAERS reports).
  - Query syntax: `search=openfda.brand_name:"{drug_name}"+OR+openfda.generic_name:"{drug_name}"&limit=1`.
  - Extract fields: `boxed_warning`, `warnings_and_cautions`, `adverse_reactions`, `indications_and_usage`.
  - Return `dict` with: `drug_name`, `indications` (truncated to 150 words), `warnings` (truncated to 200 words), `side_effects` (truncated to 200 words), `source_url` (`https://api.fda.gov/drug/label.json?...`).
  - If no results found, return `{"drug_name": drug_name, "not_found": True, "message": "No FDA label data found for this drug."}`
  - Set `httpx.Timeout(10.0, connect=5.0)`. On failure: return the `not_found` dict — never crash the caller.
- [ ] **Build a Query Classifier** (`backend/query_classifier.py`):
  - Simple keyword-based function: `classify_query(query: str) -> Set[str]` returning subsets of `{"medical_condition", "drug", "general"}`.
  - If `"drug"` is detected → hit OpenFDA. If `"medical_condition"` → hit PubMed. If `"general"` → hit both. If neither → return a polite message asking for a medical question; skip the AI call entirely.
  - Detect drug names using a small curated list embedded in the code (top 200 common generic/brand names) — no external API needed at this stage.
- [ ] **Unit Tests:** Write `pytest` tests for both clients using `pytest-httpx` to mock HTTP responses. Test: normal response, empty response, timeout, 429 rate limit. Query classifier: test "headache" → condition, "aspirin" → drug, "hello" → general rejection.

## Phase 3: Web RAG Fusion (The System Loop)
Merge the live data with the local AI model to ground the responses.

- [ ] **Prompt Engineering:** Create a strict system prompt in FastAPI (`backend/prompts.py`):
  - Role: "You are a medical research assistant. You answer ONLY using the provided context below. You NEVER use your own medical knowledge."
  - Context: Inject user query + PubMed snippets + OpenFDA data as labeled sections.
  - Citation format: "When referencing a source, use the exact marker [[CITATION:N]] where N is the citation index. Do NOT use parentheses, brackets, or any other format."
  - Fallback: "If the context contains no relevant information, say: 'I could not find relevant medical literature or drug safety data on this topic.' Do NOT fabricate information."
  - Anti-hallucination: "If you are unsure, state that you are unsure. Never guess."
- [ ] **Conversation History:** Add an in-memory session store (a `defaultdict(list)` keyed by `session_id` sent from the frontend as a query param or header). Keep the last 6 exchanges (user + assistant). Inject the history into the prompt above the live context so the model remembers what drug/condition was discussed earlier. Auto-prune sessions older than 30 minutes.
- [ ] **Assemble the Route:** Update the main `POST /api/chat` endpoint to:
  1. Accept `{"query": "...", "session_id": "..."}` via JSON body.
  2. Classify the query. If rejected, return an SSE `event: error` and stop.
  3. Run PubMed and OpenFDA searches **concurrently** via `asyncio.gather()`.
  4. Build the augmented prompt (system prompt + conversation history + retrieved context + user query).
  5. Stream the response from Ollama via SSE, emitting `token` events as they arrive.
  6. After the stream completes, emit the `citation` events and finally `event: done` with the full text and citation metadata.
- [ ] **Citation Post-Processing:** After Ollama finishes, scan the full response text for `[[CITATION:N]]` markers using `re.findall(r'\[\[CITATION:(\d+)\]\]', text)`. Validate each N against the actual citations list. Remove any citation marker referencing a non-existent index. Normalize any bracket variants the model might have generated (`[1]`, `(1)`, etc.) to the standard marker — but log a warning so you can tighten the prompt if the model drifts.
- [ ] **Error Handling for RAG:**
  - If both APIs return empty: send an SSE `event: warning` saying "No live data was found. The response below is based on the model's training data and may be outdated." Then still stream — but flag it.
  - If Ollama times out: send `event: error` with "The local model took too long to respond. Please try again."
  - If the user sends a second query while a stream is in progress: cancel the first stream (track `asyncio.Event` per session).
- [ ] **Test:** Query the backend via a Python test script (`tests/test_rag_pipeline.py`) with:
  - "What are the side effects of metformin?" → expects OpenFDA data + citations in response.
  - "What's the latest research on migraine treatment?" → expects PubMed abstracts + citations.
  - "Hello" → expects rejection message, no API calls made.
  - "Tell me about aspirin for heart attacks" → expects both PubMed AND OpenFDA data merged.
- [ ] **Evaluation Baseline:** Create `tests/eval_questions.json` with 15 medical questions and manually verified expected facts. After Phase 3, run the eval script (`tests/run_eval.py`) and score:
  - **Answer groundedness:** % of claims in the response that are supported by the retrieved context (manual spot-check or future automated NLI).
  - **Citation accuracy:** % of `[[CITATION:N]]` markers where the cited source actually contains the claimed fact.
  - **Hallucination rate:** % of responses containing medical claims not found in ANY retrieved source.

## Phase 4: Web Frontend (The User Interface)
Build the visual interface to consume the streaming data and display clickable links.

- [ ] **Initialize Next.js:** Scaffold with `npx create-next-app@latest frontend --typescript --tailwind --app --no-eslint`.
- [ ] **Component Tree Design:**
  ```
  ChatContainer (manages session_id, message list)
  ├── ChatHeader (title + "New Chat" button)
  ├── MessageList (scrollable, auto-scrolls on new tokens)
  │   └── MessageBubble (role + content + citation links)
  │       └── CitationLink[] (clickable pills: "[1] Title", opens in new tab)
  ├── ChatInput (text area + send button, disabled during streaming)
  └── StatusBar (shows "Searching PubMed/OpenFDA..." → "Streaming..." → "Done")
  ```
- [ ] **State Management:** Use `useReducer` with these actions:
  - `ADD_USER_MESSAGE` — append user's query to message list.
  - `ADD_ASSISTANT_MESSAGE` — create an empty assistant bubble.
  - `APPEND_TOKEN` — append text to the latest assistant message content.
  - `ADD_CITATION` — attach citation metadata to the latest assistant message.
  - `SET_STREAMING_DONE` — mark the assistant message as complete.
  - `SET_ERROR` — show error state in the latest assistant bubble.
  - `CLEAR_CHAT` — reset to initial state.
- [ ] **Implement SSE Consumer** (`frontend/hooks/useChatStream.ts`):
  - Open `EventSource` or use `fetch()` with `ReadableStream` to `POST /api/chat`.
  - Dispatch `APPEND_TOKEN` on `event: token`.
  - Dispatch `ADD_CITATION` on `event: citation`.
  - Dispatch `SET_STREAMING_DONE` on `event: done`.
  - Dispatch `SET_ERROR` on `event: error` or `event: warning`.
  - Use `AbortController` to cancel in-flight streams when the user sends a new query or clicks "New Chat."
  - On `AbortController` abort, send the cancellation to the backend so Ollama stops generating.
- [ ] **Citation Rendering:** The backend already sends citation metadata as structured JSON via `event: citation`. Render each as a clickable pill/badge below the message text: `[1] Paper Title` → `<a href="url" target="_blank" rel="noopener noreferrer">`. No regex parsing needed on the frontend.
- [ ] **UI States (handle all of them):**
  - **Idle:** Empty chat with placeholder "Ask a medical question..."
  - **Loading (searching):** Status bar shows "Searching PubMed & OpenFDA..." with a spinner.
  - **Streaming:** Tokens appear progressively. Input is disabled. A "Stop" button is shown.
  - **Complete:** All citations rendered as pills. Input re-enabled.
  - **Error:** Red banner in the chat bubble with the error message. Input re-enabled.
  - **Empty results:** Yellow banner "No live data found — response may be based on training data."
- [ ] **Session Persistence:** Generate a random `session_id` on first visit (store in `localStorage`). Send it with every `POST /api/chat`. This enables conversation history on the backend.
- [ ] **Frontend Tests:**
  - Unit test the citation rendering component with mock data.
  - Unit test the `useChatStream` hook with a mocked `EventSource`.
  - Integration test: full chat flow with a mocked SSE endpoint (using MSW).
- [ ] **End-to-End Test:** Manual browser test — ask "What are the risks of ibuprofen during pregnancy?" and verify: (a) text streams smoothly, (b) citations appear as clickable links, (c) links open PubMed/FDA pages in new tabs, (d) follow-up question "What about acetaminophen?" retains context.

---

## Definition of Done
- [ ] Claude Code understands the stack via `.claude/skills/medical-rag/SKILL.md`.
- [ ] MedGemma runs entirely locally via Ollama with proper timeout/error handling.
- [ ] PubMed and OpenFDA clients return structured data with retry logic and graceful fallbacks.
- [ ] Query classifier prevents wasted API calls on non-medical queries.
- [ ] The LLM generates answers strictly from the fetched context, with citations in a machine-parseable format (`[[CITATION:N]]`).
- [ ] Conversation history across turns (session-based, 6-turn window, 30-min TTL).
- [ ] The React frontend streams text smoothly, renders citations as structured clickable pills (no fragile regex), and handles all UI states (loading, streaming, error, empty, complete).
- [ ] Backend has `pytest` unit tests for both API clients and the query classifier.
- [ ] Frontend has unit tests for the SSE hook and citation rendering.
- [ ] Eval baseline of 15 questions with groundedness and citation accuracy scores recorded.
