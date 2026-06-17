# Frontend Design Spec: Medical Citation Chatbot

**Date:** 2026-06-17
**Status:** Approved
**Scope:** Phase 4 — Web Frontend (UI only; backend integration via SSE contract)

---

## 1. Overview

A clean, warm-toned medical chatbot frontend built with Next.js (App Router), TypeScript, and Tailwind CSS. The UI streams responses from a FastAPI backend via Server-Sent Events (SSE) and renders clickable citation pills linking to PubMed and FDA sources.

---

## 2. Design System: Warm Wellness

### 2.1 Philosophy
Approachable and human, like a caring pharmacist. Soft warm tones, generous rounded corners, pill-shaped elements. Professional enough for clinical use, warm enough to reduce anxiety about medical questions.

### 2.2 Color Tokens

| Token | Hex | Tailwind Class (custom) | Usage |
|-------|-----|------------------------|-------|
| Teal primary | `#14b8a6` | `teal-primary` | Buttons, user message bubbles, accent dots, send button |
| Teal light | `#d4f7f0` | `teal-light` | PubMed citation pills, status bubbles, hover states |
| Teal dark text | `#0f766e` | `teal-dark` | PubMed citation pill text, status text |
| Amber light | `#fef3c7` | `amber-light` | FDA citation pills |
| Amber dark text | `#92400e` | `amber-dark` | FDA citation pill text |
| Cream background | `#faf5f0` | `cream-bg` | Page background |
| White | `#ffffff` | — | Assistant message cards |
| Warm gray text | `#44403c` | `warm-gray` | Body text |
| Muted text | `#a1887f` | `muted-warm` | Placeholders, timestamps, secondary text |
| Border | `#e8d5c4` | `warm-border` | Card borders, input borders, dividers |

### 2.3 Typography

- **Font:** System UI stack (`system-ui, -apple-system, sans-serif`)
- **Scale (Tailwind):** `text-xs` (11px metadata), `text-sm` (13px body), `text-base` (15px headings), `text-lg` (18px welcome heading)
- **Weight:** `font-medium` for emphasis, `font-semibold` for header title
- **Line height:** `leading-relaxed` (1.625) for assistant messages to improve medical text readability

### 2.4 Shapes & Spacing

- Chat bubbles: `rounded-2xl` (12px) with directional corners
- Citation pills: `rounded-full` (pill shape)
- Input area: `rounded-2xl` (16px)
- Send button: `rounded-full` circle
- Conversation sidebar items: `rounded-lg` (8px)
- Example chips: `rounded-full`

---

## 3. Component Tree

```
App
├── Sidebar
│   ├── NewChatButton
│   └── ConversationList
│       └── ConversationItem[] (title, timestamp, active indicator)
├── MainArea
│   ├── HeaderBar ("Medical Assistant" title + warm indicator dot)
│   ├── ChatContainer
│   │   ├── EmptyState (welcome card + 3 clickable example chips)
│   │   ├── StatusBubble (inline: "Searching PubMed & OpenFDA...")
│   │   └── MessageList
│   │       ├── UserMessage (right-aligned, teal bubble)
│   │       └── AssistantMessage (left-aligned, white card)
│   │           ├── StreamingText (tokens appended progressively)
│   │           ├── StreamingDots (3 pulsing teal dots while live)
│   │           └── CitationPills (inline colored badges)
│   └── InputArea
│       └── AutoExpandTextarea + SendButton
```

### 3.1 Component Responsibilities

**Sidebar** — Collapsible panel (toggle via hamburger or swipe). Lists past conversations by title from `localStorage`. Active conversation has teal highlight. Each item shows truncated first query as title + relative timestamp. "New Chat" button at top.

**NewChatButton** — Full-width button, teal, `+ New Chat` label. Resets the message list, generates a new `session_id`, clears the chat view.

**ConversationList** — Scrollable list of `ConversationItem` components. Sorted newest-first. Stores sessions in `localStorage` keyed by `session_id`.

**ConversationItem** — Displays truncated conversation title, relative timestamp. Click to load that session's messages (from localStorage). Active item has `bg-teal-light` background.

**HeaderBar** — Simple bar: teal dot (8px circle, `#14b8a6`) + "Medical Assistant" in `font-semibold`. Fixed at top of MainArea.

**ChatContainer** — Flex column, `overflow-y-auto`, grows to fill available space. Hosts scroll logic: auto-scrolls to bottom when new tokens arrive, unless user has scrolled up manually (show "Scroll to bottom" button in that case).

**EmptyState** — Centered card with: 🩺 emoji icon, "Medical Research Assistant" heading, subtitle explaining the tool, and 3 clickable example chips. Tapping a chip auto-fills and submits the input. Only shown when `messages.length === 0`.

**StatusBubble** — Left-aligned ghost bubble with teal-light background. Shows transient status text: "Searching PubMed & OpenFDA...", "Streaming response...", "Searching (this may take a moment)...". Appears between user message and the assistant's streaming response. Disappears when `done` event arrives.

**MessageList** — Renders the messages array. Each message is `{role, content, citations, status}` where status is `streaming | done | error`.

**UserMessage** — Right-aligned, teal-primary (`#14b8a6`) background, white text, `rounded-2xl rounded-br-md` (directional corner for chat feel). Padding: `py-3 px-4`.

**AssistantMessage** — Left-aligned, white background, warm-gray text, `rounded-2xl rounded-bl-md`, with warm-border (`#e8d5c4`) border. Contains `StreamingText` + `StreamingDots` while live, then `CitationPills` after completion.

**StreamingText** — Plain `<p>` element that receives appended tokens. No cursor — text just grows.

**StreamingDots** — Three `<div>` circles (6px), teal primary, with CSS animation (`animate-pulse` with staggered `animation-delay`). Rendered below the StreamingText while status is `streaming`. Hidden on `done`.

**CitationPills** — Inline `<span>` elements rendered inside the AssistantMessage text. PubMed pills: `bg-teal-light text-teal-dark`. FDA pills: `bg-amber-light text-amber-dark`. Both: `rounded-full px-2 py-0.5 text-xs font-medium`. Click opens URL in `target="_blank" rel="noopener noreferrer"`. Format: `[1] PubMed ↗` or `[2] FDA Label ↗`.

**AutoExpandTextarea** — A `<textarea>` that starts at 1 row (40px), grows to max 5 rows (120px), then scrolls internally. Submit on Enter (Shift+Enter for newline). Placeholder: "Ask a medical question...".

**SendButton** — 32px teal circle with arrow icon. Disabled (grayed out) when input is empty or during streaming. During streaming, becomes a "Stop" button (square, red-tinged) that cancels the in-flight SSE connection.

---

## 4. SSE Wire Contract

The frontend opens a `fetch()` with `ReadableStream` to `POST /api/chat` with body `{query, session_id}`.

### Event Types

```
event: token
data: {"text": "Aspirin"}

event: citation
data: {"index": 1, "url": "https://pubmed.ncbi.nlm.nih.gov/12345/", "title": "Aspirin: Mechanism and Clinical Use", "source": "pubmed"}

event: done
data: {"full_text": "...", "citations": [...]}

event: error
data: {"message": "The local model took too long to respond. Please try again.", "code": "TIMEOUT"}

event: warning
data: {"message": "No live data found — response may be based on training data."}
```

### Frontend Handling

| SSE Event | Action |
|-----------|--------|
| `token` | Append `data.text` to the latest assistant message content. Show StreamingDots. |
| `citation` | Push `{index, url, title, source}` to the message's `citations` array. |
| `done` | Hide StreamingDots. Mark message as complete. Re-enable input. |
| `error` | Show error banner inside the assistant bubble. Re-enable input. |
| `warning` | Show yellow warning banner above the assistant message. |

---

## 5. State Management

### useReducer Actions

```typescript
type Action =
  | { type: 'ADD_USER_MESSAGE'; text: string }
  | { type: 'CREATE_ASSISTANT_MESSAGE' }
  | { type: 'APPEND_TOKEN'; text: string }
  | { type: 'ADD_CITATION'; citation: Citation }
  | { type: 'SET_STREAMING_DONE' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_WARNING'; message: string }
  | { type: 'SET_STATUS'; status: string }
  | { type: 'HIDE_STATUS' }
  | { type: 'CLEAR_CHAT' }
  | { type: 'LOAD_SESSION'; messages: Message[] }
```

### Message Shape

```typescript
interface Citation {
  index: number;
  url: string;
  title: string;
  source: 'pubmed' | 'fda';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  status: 'streaming' | 'done' | 'error';
  errorMessage?: string;
  warningMessage?: string;
}
```

### Session Shape

```typescript
interface Session {
  id: string;          // UUID generated on first visit
  title: string;       // First user query, truncated to 50 chars
  createdAt: number;   // Date.now()
  updatedAt: number;
  messages: Message[];
}
```

Sessions persist in `localStorage` under key `medical-chatbot-sessions`. The active `session_id` is stored under `medical-chatbot-active-session`.

---

## 6. Streaming Flow (Detailed)

```
User clicks Send
  → dispatch ADD_USER_MESSAGE
  → dispatch CREATE_ASSISTANT_MESSAGE  
  → dispatch SET_STATUS("Searching PubMed & OpenFDA...")
  → fetch POST /api/chat {query, session_id}
      ├── ReadableStream reader
      ├── Parse SSE lines
      ├── event:token → dispatch APPEND_TOKEN
      ├── event:citation → dispatch ADD_CITATION
      ├── event:done → dispatch SET_STREAMING_DONE + HIDE_STATUS
      ├── event:error → dispatch SET_ERROR + HIDE_STATUS
      └── event:warning → dispatch SET_WARNING
  → If user clicks Stop:
      ├── AbortController.abort()
      └── dispatch SET_STREAMING_DONE (partial text kept)
```

### Cancellation

- An `AbortController` is created each time `sendMessage` is called.
- If the user clicks "Stop" (the Send button morphs during streaming), `controller.abort()` is called.
- If the user sends a new query while streaming, the previous `AbortController` is aborted first.
- On abort, the partial text already streamed stays visible. No retry.

---

## 7. Loading / Empty / Error / Edge States

| State | Visual |
|-------|--------|
| **Initial (empty)** | Welcome card centered: 🩺 + heading + subtitle + 3 example chips |
| **Searching** | StatusBubble: "Searching PubMed & OpenFDA..." with animated teal dots |
| **Streaming** | AssistantMessage grows token by token. StreamingDots pulse below. Input shows Stop button. |
| **Complete** | Full text visible. CitationPills rendered as colored badges. Input re-enabled. StatusBubble gone. |
| **Error (timeout)** | Red banner in assistant bubble: "The model took too long to respond. Please try again." Input enabled. |
| **Error (API down)** | Red banner: "Could not reach the server. Please check your connection." Input enabled. |
| **Warning (no data)** | Yellow banner: "No live data found — response may be based on training data." Message still shown. |
| **Empty results** | Assistant message: "I could not find relevant medical literature or drug safety data on this topic." No citations. |
| **Non-medical query** | Assistant message: "Please ask a medical or drug-related question. I'm designed to search PubMed and FDA databases." No API call made. |
| **Long message** | ChatContainer scrolls. "Scroll to bottom" button appears if user has scrolled up during streaming. |
| **Mobile** | Sidebar collapses to hamburger menu. Full-width chat. Input stays at bottom with `position: sticky`. |

---

## 8. File Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Main chat page
│   └── globals.css         # Tailwind directives + custom color tokens
├── components/
│   ├── Sidebar.tsx
│   ├── ChatContainer.tsx
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx   # Handles both user and assistant rendering
│   ├── CitationPill.tsx
│   ├── StatusBubble.tsx
│   ├── StreamingDots.tsx
│   ├── EmptyState.tsx
│   ├── AutoExpandTextarea.tsx
│   └── SendButton.tsx
├── hooks/
│   ├── useChatReducer.ts   # useReducer with all actions
│   ├── useChatStream.ts    # SSE fetch + AbortController
│   └── useSessionStore.ts  # localStorage session persistence
├── lib/
│   ├── types.ts            # Citation, Message, Session interfaces
│   ├── constants.ts        # Color tokens, example questions, status messages
│   └── utils.ts            # generateUUID, truncateTitle, formatTimestamp
└── tailwind.config.ts      # Extended with custom warm-wellness colors
```

---

## 9. Testing Plan

### Unit Tests (Vitest)
- `CitationPill` — renders PubMed pill in teal, FDA pill in amber, opens URL on click
- `StreamingDots` — renders 3 dots with staggered animation delays
- `StatusBubble` — renders correct text, hidden when status is null
- `EmptyState` — renders heading, subtitle, 3 chips; clicking chip calls submit callback
- `AutoExpandTextarea` — submit on Enter, newline on Shift+Enter, max 5 rows
- `useChatReducer` — each action produces correct state transitions
- `useSessionStore` — save/load/delete sessions from localStorage

### Integration Tests (Vitest + MSW)
- Full streaming flow: mock SSE endpoint → verify tokens append → citations render → done hides dots
- Error flow: mock 500 → verify error banner shows → input re-enabled
- Session load: mock localStorage → load old session → messages render correctly

---

## 10. Dependencies

```json
{
  "next": "^14.0",
  "react": "^18.3",
  "react-dom": "^18.3",
  "tailwindcss": "^3.4",
  "typescript": "^5.4",
  "vitest": "^1.6",
  "@testing-library/react": "^15.0",
  "msw": "^2.3"
}
```

No additional UI libraries — all components are custom-built with Tailwind. No shadcn/ui needed since we're not using Radix primitives for this simple chat interface.

---

## 11. Non-Goals (What This Spec Does NOT Cover)

- Backend implementation (see plan.md Phases 1-3)
- Authentication or user accounts
- Dark mode (Warm Wellness is light-mode only for v1)
- File upload / image analysis
- Multi-language support
- Analytics or usage tracking
- Keyboard shortcuts beyond Enter/Shift+Enter
