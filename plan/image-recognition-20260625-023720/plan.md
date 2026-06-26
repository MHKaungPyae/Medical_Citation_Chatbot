# Image Recognition Implementation Plan

## Goal
Add image recognition to the Medical Citation Chatbot so users can upload prescription or medicine images and receive AI-generated analysis using medgemma1.5:4b-it-q8_0's built-in vision capability.

## Acceptance Criteria
1. Users can upload JPEG/PNG/WebP images (max 10MB) alongside text queries
2. Images are stored in Supabase Storage; only the URL is saved in PostgreSQL
3. medgemma1.5:4b-it-q8_0 (vision-capable) processes images with text queries
4. Text-only queries continue to work unchanged (backward compatible)
5. User messages with images display the image above the text
6. Image preview is shown before sending (with remove option)
7. Session history correctly loads and displays images

## Existing Patterns to Follow
- **SSE streaming**: Same event types (token, citation, done, error, warning, info)
- **Error handling**: Return SSE error events, never crash the pipeline
- **Auth**: Same JWT verification via `get_current_user` dependency
- **Supabase**: Same client singleton pattern via `get_supabase()`
- **Frontend state**: Same useReducer pattern with typed actions
- **Component structure**: Same React.memo, same props interface pattern

## Files to Change

### Backend (6 files)
| File | Change Type | Description |
|------|-------------|-------------|
| `backend/config.py` | Modify | Add STORAGE_BUCKET constant (model stays medgemma1.5:4b-it-q8_0) |
| `backend/main.py` | Modify | Change /api/chat to accept multipart/form-data with optional image |
| `backend/symptom_pipeline.py` | Modify | Add image support to existing stream (pass images field) |
| `backend/session_store.py` | Modify | Add image_url to save() and get_history() |
| `backend/storage_client.py` | New | Supabase Storage upload helper |

### Frontend (7 files)
| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/lib/types.ts` | Modify | Add imageUrl to Message, update ChatAction |
| `frontend/hooks/useChatReducer.ts` | Modify | Handle imageUrl in ADD_USER_MESSAGE |
| `frontend/hooks/useChatController.ts` | Modify | Add image state, pass to sendMessage |
| `frontend/hooks/useChatStream.ts` | Modify | Send FormData instead of JSON when image present |
| `frontend/components/ChatContainer.tsx` | Modify | Add image upload button and preview area |
| `frontend/components/MessageBubble.tsx` | Modify | Render image in user messages |
| `frontend/components/ImagePreview.tsx` | New | Preview component with remove button |
| `frontend/components/Icons.tsx` | Modify | Add IconAttach |
| `frontend/lib/constants.ts` | Modify | Add IMAGE_CONSTRAINTS |

### Database (Manual SQL)
| Operation | Description |
|-----------|-------------|
| ALTER TABLE messages | Add image_url TEXT column |
| Create Storage Bucket | chat-images bucket in Supabase |
| RLS Policies | Users can read/write own images |

## Phase Plan

### Phase 1: Database Schema & Config
- Add image_url column to messages table
- Create Supabase Storage bucket with RLS
- Add storage bucket config constant
- **Verification**: Column exists, bucket exists, config loads

### Phase 2: Backend Image Storage & Upload
- Create storage_client.py for Supabase Storage operations
- Modify /api/chat to accept multipart/form-data
- Update session_store.py to save image_url
- **Verification**: Upload works, image_url saved in DB

### Phase 3: Vision Model Pipeline
- Add image support to _stream_ollama() (pass base64 images to Ollama)
- Same pipeline handles both text and image queries
- Build vision-specific prompt
- **Verification**: Vision model responds to image+text queries

### Phase 4: Frontend Types & State
- Update Message interface with imageUrl
- Update ChatAction and reducer
- **Verification**: TypeScript compiles, no type errors

### Phase 5: Frontend Image Upload UI
- Add image state to useChatController
- Modify useChatStream to send FormData
- Create ImagePreview component
- Add attachment button to ChatContainer
- **Verification**: Can select image, preview shows, multipart sent

### Phase 6: Image Rendering in Messages
- Update MessageBubble to show images
- Update session loading to include image_url
- **Verification**: Images display in messages, history loads correctly

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| medgemma1.5:4b-it-q8_0 vision quality | Poor image analysis | Test with real prescriptions, adjust prompt |
| Signed URL expiry | Images disappear | Use longer expiry or public bucket |
| Large image uploads | Slow UX | Client-side compression, size limit |
| Multipart breaks existing frontend | Deploy blocked | Phase 2 and 5 must ship together |
| Memory pressure from base64 | Backend crash | Limit image size, compress on client |

## Unknowns
- Whether medgemma1.5:4b-it-q8_0 vision works well for prescription/medicine images
- Whether Supabase Storage RLS works with service_role key bypass
- Optimal signed URL expiry duration
- Whether client-side compression is needed or 10MB limit is sufficient

## Verification Commands

### Backend
```bash
# Type check
cd /Users/panda/Desktop/Medical_Citation_Chatbot
PYTHONPATH=. python -c "from backend.main import app; print('OK')"

# Test text-only (regression)
curl -X POST http://localhost:8000/api/chat \
  -F "query=What is aspirin?" \
  -F "session_id=test" \
  -H "Authorization: Bearer TOKEN"

# Test with image
curl -X POST http://localhost:8000/api/chat \
  -F "query=What medication is this?" \
  -F "session_id=test" \
  -F "image=@test.jpg" \
  -H "Authorization: Bearer TOKEN"
```

### Frontend
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npx tsc --noEmit
npm run dev
```

### Database
```sql
-- Verify column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'image_url';

-- Verify image_url populated after test
SELECT image_url FROM messages WHERE session_id = 'test' AND role = 'user';
```

## Recommended First Implementation Step
Start with Phase 1 (Database Schema & Config) — it has no code dependencies and establishes the foundation for all other phases. The SQL migration and bucket creation are manual steps that should be done first.

## Plan Folder
`/Users/panda/Desktop/Medical_Citation_Chatbot/plan/image-recognition-20260625-023720/`
