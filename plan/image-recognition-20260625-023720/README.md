# Image Recognition Feature — Implementation Plan

## Quick Summary
Add image upload support to the Medical Citation Chatbot. Users can upload prescription or medicine images, which are stored in Supabase Storage and processed by medgemma1.5:4b-it-q8_0's built-in vision capability.

## Status
- [ ] Phase 1: Database Schema & Config
- [ ] Phase 2: Backend Image Storage & Upload
- [ ] Phase 3: Vision Model Pipeline
- [ ] Phase 4: Frontend Types & State
- [ ] Phase 5: Frontend Image Upload UI
- [ ] Phase 6: Image Rendering in Messages

## Key Decisions
- **Storage**: Supabase Storage (S3-compatible), not local filesystem
- **DB Schema**: New `image_url` column on messages table (nullable)
- **Vision Model**: medgemma1.5:4b-it-q8_0 (built-in vision, no separate model needed)
- **API Format**: Multipart/form-data when image present, JSON when text-only
- **Backward Compat**: Text-only queries work exactly as before

## Files Overview
- 6 backend files modified/created
- 7 frontend files modified/created
- 1 manual SQL migration
- 1 Supabase Storage bucket + RLS policies

## Quick Links
- [Full Plan](plan.md)
- [Research](research/)
- [Phase 1](phases/phase-1-database-schema.md)
- [Phase 2](phases/phase-2-backend-storage.md)
- [Phase 3](phases/phase-3-vision-pipeline.md)
- [Phase 4](phases/phase-4-frontend-types.md)
- [Phase 5](phases/phase-5-frontend-upload.md)
- [Phase 6](phases/phase-6-image-rendering.md)
