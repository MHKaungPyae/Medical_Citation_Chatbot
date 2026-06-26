# Phase 1: Database Schema & Config

## Goal
Add the `image_url` column to the messages table and add image/storage configuration.

## Files to Change
- `backend/config.py` — add image and storage config constants
- Supabase dashboard — run ALTER TABLE SQL

## Implementation Steps

### 1.1 Add Image & Storage Config (backend/config.py)
Add these constants after the Ollama section:

```python
# ── Image Support ─────────────────────────────────────────────────────────
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ── Supabase Storage ──────────────────────────────────────────────────────
STORAGE_BUCKET = "chat-images"
STORAGE_SIGNED_URL_EXPIRY = 86400  # 1 day
```

### 1.2 Add image_url Column (Supabase Dashboard)
Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### 1.3 Create Storage Bucket (Supabase Dashboard)
1. Go to Storage in Supabase dashboard
2. Create new bucket named `chat-images`
3. Set to private (not public)
4. Add RLS policy: users can read/write their own paths

### 1.4 Add Storage RLS Policy (Supabase Dashboard)
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Risks
- Storage bucket creation is manual (no Terraform/migration tool)
- RLS policy syntax may need adjustment based on Supabase version
- Column addition is irreversible without data loss if rolled back

## Rollback Notes
- DROP COLUMN image_url (will lose image references)
- Delete storage bucket (will lose all images)
- Remove config constants from config.py

## Verification
1. Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'image_url';` in Supabase SQL Editor
2. Verify storage bucket exists in Supabase Storage dashboard
3. Run `python -c "from backend.config import MAX_IMAGE_SIZE, STORAGE_BUCKET; print(MAX_IMAGE_SIZE, STORAGE_BUCKET)"` from project root
