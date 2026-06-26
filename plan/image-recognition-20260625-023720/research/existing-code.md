# Existing Code Analysis — Image Recognition Feature

## Backend Architecture

### Current Chat Endpoint (backend/main.py)
- POST /api/chat accepts JSON body: `{ query: string, session_id: string }`
- Returns StreamingResponse with SSE events
- No file upload support — pure JSON
- Auth via `get_current_user` dependency is NOT used on this endpoint (only on session routes)

### Pipeline (backend/symptom_pipeline.py)
- `run(query, session_id)` is the main entry point
- Accepts only text query
- Streams SSE events: token, citation, done, error, warning, info
- Persists messages via `session_store.save(session_id, role, content)`
- Message content is plain text only

### Session Store (backend/session_store.py)
- Supabase table `messages` with columns: session_id, role, content, created_at
- `save()` inserts `{ session_id, role, content }`
- `save_citations()` updates `citations_json` on last assistant message
- No image_url or metadata column currently

### Supabase Client (backend/supabase_client.py)
- Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`)
- Service role key bypasses RLS — suitable for storage operations
- Singleton pattern via `get_supabase()`

### Config (backend/config.py)
- OLLAMA_MODEL = "medgemma1.5:4b-it-q8_0" (not vision-capable)
- OLLAMA_URL = "http://localhost:11434/api/generate"
- No vision model config exists

### Ollama API (current)
- Uses `/api/generate` endpoint with `prompt` field
- Vision models require `/api/generate` with `images` field (base64 array)
- Or `/api/chat` endpoint with messages containing `images` array

## Frontend Architecture

### Message Type (frontend/lib/types.ts)
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  status: MessageStatus;
  errorMessage?: string;
  warningMessage?: string;
}
```
- No imageUrl or imageMetadata field

### Chat State & Reducer (frontend/hooks/useChatReducer.ts)
- 12 action types, no image handling
- `ADD_USER_MESSAGE` action: `{ type: 'ADD_USER_MESSAGE'; text: string }`
- Needs new action or modification for image attachment

### Chat Stream (frontend/hooks/useChatStream.ts)
- `sendMessage(query: string)` sends JSON via `authenticatedFetch`
- Content-Type: application/json
- Must change to multipart/form-data for image upload

### Chat Controller (frontend/hooks/useChatController.ts)
- `handleSend` calls `sendMessage(inputValue.trim())`
- No image state management
- Needs: image preview state, image file storage, clear-on-send

### Chat Container (frontend/components/ChatContainer.tsx)
- Renders AutoExpandTextarea + SendButton
- No image upload button or preview area
- Props: inputValue, onInputChange, onSend, onStop

### AutoExpandTextarea (frontend/components/AutoExpandTextarea.tsx)
- Pure textarea with auto-height
- No file input or attachment button

### MessageBubble (frontend/components/MessageBubble.tsx)
- User messages: plain text in teal bubble
- Assistant messages: text with citation rendering
- No image rendering for user messages

### API Helper (frontend/lib/api.ts)
- `authenticatedFetch(url, options)` injects Supabase JWT
- Works with any Content-Type — no changes needed for multipart

## Key Constraints
- Backend must remain backward-compatible (text-only queries still work)
- Ollama vision models accept images as base64 strings in the `images` array
- Supabase Storage requires bucket creation and RLS policies
- Image upload should happen BEFORE sending chat message (upload returns URL)
- Frontend needs: file input, preview, upload progress, image display in messages
