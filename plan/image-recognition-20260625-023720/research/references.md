# References — Image Recognition Feature

## Ollama Vision Models

### llava:7b
- Most mature vision model for Ollama
- Accepts images via `images` field in generate/chat API
- Good at medical image recognition
- ~4GB download, requires ~8GB RAM
- Command: `ollama pull llava:7b`

### moondream
- Lightweight vision model (~1.7GB)
- Faster inference, lower quality
- Good for basic image description
- Command: `ollama pull moondream`

### llava:13b
- Higher quality than 7b variant
- Requires ~16GB RAM
- Slower inference
- Command: `ollama pull llava:13b`

### Recommendation
- Start with llava:7b (best balance of quality and resource usage)
- Make model name configurable in config.py
- User does NOT want to check if model is vision-capable — just use it

## Ollama API for Vision

### POST /api/generate (vision)
```json
{
  "model": "llava:7b",
  "prompt": "What is in this image?",
  "images": ["base64_encoded_image_string"],
  "stream": true
}
```

### POST /api/chat (alternative)
```json
{
  "model": "llava:7b",
  "messages": [
    {
      "role": "user",
      "content": "What is in this image?",
      "images": ["base64_encoded_image_string"]
    }
  ],
  "stream": true
}
```

## Supabase Storage

### Creating a Bucket
```sql
-- In Supabase dashboard > Storage > New Bucket
-- Name: chat-images
-- Public: false (use signed URLs)
```

### Python SDK Upload
```python
from backend.supabase_client import get_supabase

db = get_supabase()
# Upload file
db.storage.from_("chat-images").upload(
    path="user123/session456/1234567890_prescription.jpg",
    file=image_bytes,
    file_options={"content-type": "image/jpeg"}
)

# Get signed URL (valid for 1 hour)
signed_url = db.storage.from_("chat-images").create_signed_url(
    path="user123/session456/1234567890_prescription.jpg",
    expires_in=3600
)
```

### JavaScript SDK Upload
```typescript
import { supabase } from '@/lib/supabase';

// Upload file
const { data, error } = await supabase.storage
  .from('chat-images')
  .upload(`${userId}/${sessionId}/${timestamp}_${filename}`, file, {
    contentType: file.type,
  });

// Get signed URL
const { data: urlData } = await supabase.storage
  .from('chat-images')
  .createSignedUrl(path, 3600);
```

## FastAPI Multipart Upload

### Endpoint with File Upload
```python
from fastapi import File, Form, UploadFile

@app.post("/api/chat")
async def chat(
    query: str = Form(...),
    session_id: str = Form(""),
    image: UploadFile = File(None),
):
    # Process image if present
    if image:
        image_bytes = await image.read()
        # Upload to Supabase Storage
        # Pass to vision model
```

### Frontend Multipart Request
```typescript
const formData = new FormData();
formData.append('query', text);
formData.append('session_id', sessionId);
if (imageFile) {
  formData.append('image', imageFile);
}

const response = await authenticatedFetch('/api/chat', {
  method: 'POST',
  body: formData,
  // Do NOT set Content-Type — browser sets it with boundary
});
```

## Database Schema

### Add image_url Column
```sql
ALTER TABLE messages ADD COLUMN image_url TEXT;
```

### Update Session Store
```python
# In session_store.py save()
db.table("messages").insert({
    "session_id": session_id,
    "role": role,
    "content": content,
    "image_url": image_url,  # New field
}).execute()
```
