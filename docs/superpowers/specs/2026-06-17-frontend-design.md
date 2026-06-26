# Frontend Design Spec: Medical Citation Chatbot

**Date:** 2026-06-17
**Status:** Approved
**Scope:** Phase 4 — Web Frontend (UI only; backend integration via SSE contract)

---

## 1. Overview

A glassmorphism medical chatbot frontend built with Next.js (App Router), TypeScript, and Tailwind CSS. Features an animated WebGL shader background, frosted glass panels, and indigo accents. Streams responses from a FastAPI backend via Server-Sent Events (SSE) and renders clickable citation pills.

---

## 2. Design System: Glassmorphism

### 2.1 Philosophy
Modern frosted glass aesthetic over an animated WebGL shader background. Translucent dark panels with backdrop blur, white text at varying opacity levels, and indigo (`#6366f1`) as the primary accent. Professional and immersive — the shader background adds visual depth while frosted panels keep content readable.

### 2.2 Color Tokens

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Indigo primary | `#6366f1` | inline style gradient | Buttons, user accents, profile avatar |
| White (full) | `#ffffff` | `text-white` | Primary text, headings |
| White 90% | `rgba(255,255,255,0.9)` | `text-white/90` | Message body text |
| White 60% | `rgba(255,255,255,0.6)` | `text-white/60` | Timestamps, secondary text |
| White 50% | `rgba(255,255,255,0.5)` | `text-white/50` | Placeholders, empty states |
| White 15% border | `rgba(255,255,255,0.15)` | `border-white/15` | Message card borders |
| White 10% border | `rgba(255,255,255,0.1)` | `border-white/10` | Sidebar, header, dividers |
| Black 25% bg | `rgba(0,0,0,0.25)` | `bg-black/25` | Message card background |
| Black 20% bg | `rgba(0,0,0,0.2)` | `bg-black/20` | Sidebar background |
| Black 40% bg | `rgba(0,0,0,0.4)` | `bg-black/40` | Popover backgrounds |
| Teal primary | `#14b8a6` | `bg-teal-primary` | Accent dots, session active state |
| Teal 30% | `rgba(20,184,166,0.3)` | `bg-teal-primary/30` | Active session highlight |
| Red 400 | `#f87171` | `text-red-400` | Delete button hover |

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
├── ShaderBackground (WebGL animated canvas, full-page, behind everything)
├── Sidebar (frosted glass panel, bg-black/20 backdrop-blur-md)
│   ├── NewChatButton (indigo gradient)
│   └── ConversationList
│       └── ConversationItem[] (title, timestamp, active indicator)
├── MainArea (transparent over shader)
│   ├── HeaderBar ("Medical Assistant" title + teal indicator dot)
│   ├── ChatContainer
│   │   ├── EmptyState (returns null)
│   │   ├── StatusBubble (translucent ghost bubble)
│   │   └── MessageList
│   │       ├── UserMessage (right-aligned, translucent dark card)
│   │       └── AssistantMessage (left-aligned, translucent dark card)
│   │           ├── StreamingText (tokens appended progressively)
│   │           ├── StreamingDots (pulsing dots while live)
│   │           └── CitationPills (inline colored badges)
│   └── InputArea
│       └── AutoExpandTextarea + SendButton (LiquidGlassButton)
```

### 3.1 Component Responsibilities

**Sidebar** — Frosted glass panel (`bg-black/20 backdrop-blur-md` with `border-white/10`). Lists past conversations from the Supabase-backed session store. Active conversation has `bg-teal-primary/30` highlight. Each item shows truncated first query as title + relative timestamp. "New Chat" button at top with indigo gradient. User profile with sign-out at bottom.

**NewChatButton** — Full-width button with indigo gradient (`linear-gradient(to top, rgba(99,102,241,0.9), rgba(99,102,241,0.7))`), `+ New Chat` label. Resets the message list, creates a new session via the API, clears the chat view.

**ConversationList** — Scrollable list of `ConversationItem` components. Sorted newest-first. Sessions stored in Supabase PostgreSQL, fetched via authenticated API calls.

**ConversationItem** — Displays truncated conversation title, relative timestamp. Click to load that session's messages (from API). Active item has `bg-teal-primary/30 text-white` background.

**HeaderBar** — Simple bar: teal dot (8px circle) + "Medical Assistant" in `font-semibold`. Transparent background with `border-white/10` bottom border. Fixed at top of MainArea.

**ChatContainer** — Flex column, `overflow-y-auto`, grows to fill available space. Hosts scroll logic: auto-scrolls to bottom when new tokens arrive, unless user has scrolled up manually (show "Scroll to bottom" button in that case).

**EmptyState** — Returns `null` (no placeholder UI). The animated shader background is visible in the empty state.

**StatusBubble** — Left-aligned ghost bubble with translucent background. Shows transient status text: "Searching medical information...". Appears between user message and the assistant's streaming response. Disappears when `done` event arrives.

**MessageList** — Renders the messages array. Each message is `{role, content, citations, status}` where status is `streaming | done | error`.

**UserMessage** — Right-aligned, translucent dark background (`bg-black/25 backdrop-blur-sm`), white text, `rounded-2xl rounded-br-md` with `border-white/15` border. Padding: `py-3 px-4`.

**AssistantMessage** — Left-aligned, translucent dark background (`bg-black/25 backdrop-blur-sm`), white/90 text, `rounded-2xl rounded-bl-md`, with `border-white/15` border. Contains `StreamingText` + `StreamingDots` while live, then `CitationPills` after completion.

**StreamingText** — Plain `<p>` element that receives appended tokens. No cursor — text just grows.

**StreamingDots** — Three `<div>` circles (6px), teal primary, with CSS animation (`animate-pulse` with staggered `animation-delay`). Rendered below the StreamingText while status is `streaming`. Hidden on `done`.

**CitationPills** — Inline `<span>` elements rendered inside the AssistantMessage text. Wikipedia pills: `bg-teal-light text-teal-dark`. FDA pills: `bg-amber-light text-amber-dark`. Both: `rounded-full px-2 py-0.5 text-xs font-medium`. Click opens URL in `target="_blank" rel="noopener noreferrer"`. Format: `[1] Wikipedia ↗` or `[2] FDA ↗`.

**AutoExpandTextarea** — A `<textarea>` that starts at 1 row (40px), grows to max 5 rows (120px), then scrolls internally. Submit on Enter (Shift+Enter for newline). Placeholder: "Ask a medical question...".

**SendButton** — Glassmorphism button using `LiquidGlassButton` component (Radix Slot + class-variance-authority). Indigo gradient with inset shadow highlights. Disabled when input is empty or during streaming. During streaming, becomes a "Stop" button that cancels the in-flight SSE connection.

---

## 4. SSE Wire Contract

The frontend opens a `fetch()` with `ReadableStream` to `POST /api/chat` with body `{query, session_id}`.

### Event Types

```
event: token
data: {"text": "Aspirin"}

event: citation
data: {"index": 1, "url": "https://en.wikipedia.org/wiki/Aspirin", "title": "Aspirin", "source": "wikipedia"}

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
  | { type: 'SET_STREAMING_DONE'; fullText?: string; citations?: Citation[] }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_WARNING'; message: string }
  | { type: 'SET_STATUS'; status: string }
  | { type: 'HIDE_STATUS' }
  | { type: 'CLEAR_CHAT'; sessionId?: string }
  | { type: 'LOAD_SESSION'; messages: Message[]; sessionId?: string }
  | { type: 'SET_SESSION_ID'; sessionId: string }
```

### Message Shape

```typescript
interface Citation {
  index: number;
  url: string;
  title: string;
  source: 'wikipedia' | 'fda';
  authors?: string;
  year?: string | number;
  journal?: string;
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

Sessions persist in Supabase PostgreSQL via authenticated API calls (`/api/sessions`). The frontend uses `useSessionStore` hook backed by `authenticatedFetch`.

---

## 6. Streaming Flow (Detailed)

```
User clicks Send
  → dispatch ADD_USER_MESSAGE
  → dispatch CREATE_ASSISTANT_MESSAGE  
  → dispatch SET_STATUS("Searching medical information...")
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
| **Initial (empty)** | Animated shader background visible, no placeholder UI |
| **Searching** | StatusBubble: "Searching medical information..." with animated teal dots |
| **Streaming** | AssistantMessage grows token by token. StreamingDots pulse below. Input shows Stop button. |
| **Complete** | Full text visible. CitationPills rendered as colored badges. Input re-enabled. StatusBubble gone. |
| **Error (timeout)** | Red banner in assistant bubble: "The model took too long to respond. Please try again." Input enabled. |
| **Error (API down)** | Red banner: "Could not reach the server. Please check your connection." Input enabled. |
| **Warning (no data)** | Yellow banner: "Limited medical information found. Please see a doctor for proper diagnosis." Message still shown. |
| **Long message** | ChatContainer scrolls. "Scroll to bottom" button appears if user has scrolled up during streaming. |
| **Mobile** | Sidebar collapses to hamburger menu. Full-width chat. Input stays at bottom with `position: sticky`. |

---

## 8. File Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout, metadata, AuthProvider wrapper
│   ├── page.tsx            # Main chat page (auth-protected)
│   ├── login/page.tsx      # Login page
│   ├── register/page.tsx   # Registration page
│   └── globals.css         # Tailwind import + custom color tokens
├── components/
│   ├── AuthProvider.tsx     # React context for auth state, loading spinner (indigo)
│   ├── AuthCard.tsx         # Frosted glass card (bg-black/25, backdrop-blur-md, border-white/15)
│   ├── AuthInput.tsx        # Translucent input (bg-white/5, white text, indigo focus ring)
│   ├── AuthButton.tsx       # Indigo gradient button with loading state
│   ├── Sidebar.tsx          # Conversation list + user profile
│   ├── ChatContainer.tsx    # Messages + input area
│   ├── MessageList.tsx      # Renders message array
│   ├── MessageBubble.tsx    # User + assistant message rendering
│   ├── InlineCitation.tsx   # [[CITATION:N]] → clickable badges
│   ├── CitationPill.tsx     # Rich citation display below messages
│   ├── StatusBubble.tsx     # Loading indicator
│   ├── StreamingDots.tsx    # Animated dots while streaming
│   ├── EmptyState.tsx       # Returns null (no placeholder UI)
│   ├── AutoExpandTextarea.tsx
│   ├── SendButton.tsx       # Send/stop button (LiquidGlassButton)
│   ├── ErrorBoundary.tsx    # Crash recovery
│   ├── Icons.tsx            # SVG icon components
│   └── ui/
│       ├── liquid-glass-button.tsx  # Glassmorphism button (Radix Slot + CVA)
│       └── shader-background.tsx    # WebGL animated shader canvas
├── hooks/
│   ├── useChatController.ts # Orchestrator hook
│   ├── useChatReducer.ts    # useReducer with 12 actions
│   ├── useChatStream.ts     # SSE fetch + AbortController
│   ├── useSessionStore.ts   # API-backed session CRUD
│   ├── useScrollManager.ts  # Scroll-to-bottom logic
│   └── useAuth.ts           # Supabase auth hook
├── lib/
│   ├── types.ts             # Citation, Message, Session, ChatAction types
│   ├── constants.ts         # Example questions, status messages, API_URL
│   ├── utils.ts             # generateUUID, truncateTitle, formatTimestamp
│   ├── supabase.ts          # Supabase client singleton
│   └── api.ts               # authenticatedFetch helper
└── postcss.config.mjs        # Tailwind v4 PostCSS plugin
```

---

## 9. Testing Plan

### Unit Tests (Vitest)
- `CitationPill` — renders Wikipedia pill in teal, FDA pill in amber, opens URL on click
- `StreamingDots` — renders 3 dots with staggered animation delays
- `StatusBubble` — renders correct text, hidden when status is null
- `EmptyState` — returns null (no placeholder UI)
- `AutoExpandTextarea` — submit on Enter, newline on Shift+Enter, max 5 rows
- `useChatReducer` — each action produces correct state transitions
- `useSessionStore` — CRUD sessions via authenticated API calls

### Integration Tests (Vitest + MSW)
- Full streaming flow: mock SSE endpoint → verify tokens append → citations render → done hides dots
- Error flow: mock 500 → verify error banner shows → input re-enabled
- Session load: mock API → load old session → messages render correctly

---

## 10. Dependencies

```json
{
  "next": "16.2.9",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "@supabase/supabase-js": "^2.108.2",
  "@radix-ui/react-slot": "^1.3.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.6.0",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

Additional UI libraries: `@radix-ui/react-slot` (composable button primitives), `class-variance-authority` (variant-based component styling), `clsx` + `tailwind-merge` (class name utilities). Used by the `LiquidGlassButton` component.

---

## 11. Non-Goals (What This Spec Does NOT Cover)

- Backend implementation (see backend code)
- Light mode (glassmorphism design is dark/translucent only for v1)
- File upload / image analysis
- Multi-language support
- Analytics or usage tracking
- Keyboard shortcuts beyond Enter/Shift+Enter
