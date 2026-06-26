# Requirements Analysis — Image Recognition Feature

## Functional Requirements

### FR1: Image Upload
- Users can upload medical prescription images or medicine images
- Supported formats: JPEG, PNG, WebP
- Max file size: 10MB (configurable)
- Upload happens via Supabase Storage bucket

### FR2: Image Storage
- Images stored in Supabase Storage bucket (S3-compatible)
- Only the image URL stored in PostgreSQL messages table
- Bucket name: `chat-images` (configurable)
- Path structure: `{user_id}/{session_id}/{timestamp}_{filename}`

### FR3: Vision Model Integration
- Use a vision-capable Ollama model (llava:7b, moondream, or similar)
- Model receives image (base64) + user's text query
- NO checking if model is trained with images (per user requirement)
- Text-only queries continue to use the existing medgemma1.5:4b-it-q8_0 model

### FR4: Message Storage
- New column on messages table: `image_url` (nullable text)
- User messages with images store the Supabase Storage URL
- Assistant messages remain text-only

### FR5: Frontend Display
- User messages with images show the image above the text
- Image preview before sending (with remove option)
- Upload progress indicator
- Clickable image to view full-size

### FR6: Backward Compatibility
- Text-only queries work exactly as before
- No changes to existing message rendering for text-only messages
- Pipeline fallback: if vision model fails, return error (not silent degradation)

## Non-Functional Requirements

### NFR1: Image Size Limits
- Max upload size: 10MB
- Client-side compression before upload (resize to max 1024px on longest side)
- Backend receives pre-compressed image

### NFR2: Security
- Storage bucket RLS: users can only read/write their own images
- Auth required for upload (same JWT as chat)
- Image URLs are not publicly accessible without auth token

### NFR3: Performance
- Upload happens in parallel with text input (non-blocking)
- Vision model has longer timeout (180s vs 120s for text)
- Image preview renders immediately from local File object

## Technical Constraints

### Ollama Vision API
- Endpoint: POST /api/generate (same as text)
- Body: `{ model: "llava:7b", prompt: "...", images: ["base64..."], stream: true }`
- Images must be base64-encoded strings in the `images` array
- Multiple images supported but we'll use one per message

### Supabase Storage
- SDK: `supabase.storage.from('bucket').upload(path, file)`
- Public URL: `supabase.storage.from('bucket').get_public_url(path)`
- Or signed URL with expiry for private buckets
- Service role key bypasses RLS for backend operations

### Database Schema Change
- ALTER TABLE messages ADD COLUMN image_url TEXT;
- Nullable — existing rows unaffected
- No migration tool in use — manual SQL in Supabase dashboard
