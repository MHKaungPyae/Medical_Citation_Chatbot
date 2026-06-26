# Phase 6: Image Rendering in Messages

## Goal
Display uploaded images in user messages and handle image loading from session history.

## Files to Change
- `frontend/components/MessageBubble.tsx` — render image above user message text
- `frontend/hooks/useSessionStore.ts` — include image_url when loading sessions

## Implementation Steps

### 6.1 Update MessageBubble (frontend/components/MessageBubble.tsx)
Add image rendering for user messages:

```tsx
function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-3 flex animate-fade-in justify-end">
        <div className="max-w-[80%]">
          {/* Image (if present) */}
          {message.imageUrl && (
            <div className="mb-1.5 overflow-hidden rounded-2xl rounded-br-md">
              <img
                src={message.imageUrl}
                alt="Uploaded medical image"
                className="max-h-64 w-auto rounded-2xl object-cover cursor-pointer
                           transition-opacity hover:opacity-90"
                onClick={() => window.open(message.imageUrl, '_blank')}
                loading="lazy"
              />
            </div>
          )}
          
          {/* Text content */}
          {message.content && (
            <div className="rounded-2xl rounded-br-md bg-teal-primary px-4 py-3
                            text-sm leading-relaxed text-white shadow-sm">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ... existing assistant message rendering ...
}
```

### 6.2 Update Session Loading (frontend/hooks/useSessionStore.ts)
Include image_url when loading messages from API:

```typescript
// In the function that maps API messages to frontend Message type:
const messages: Message[] = apiMessages.map((msg: any) => ({
  id: msg.id || generateUUID(),
  role: msg.role,
  content: msg.content,
  citations: msg.citations_json ? JSON.parse(msg.citations_json) : [],
  status: 'done' as const,
  imageUrl: msg.image_url || undefined,  // NEW
}));
```

### 6.3 Handle Signed URL Expiry
Images from old sessions may have expired signed URLs. Add error handling:

```tsx
// In MessageBubble, add error handler for image load
<img
  src={message.imageUrl}
  alt="Uploaded medical image"
  onError={(e) => {
    // Hide broken image
    (e.target as HTMLImageElement).style.display = 'none';
  }}
  // ... other props
/>
```

### 6.4 Update Session Store Response Types
If the session store returns typed data, add image_url to the response type:

```typescript
interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  citations_json?: string;
  created_at: string;
}
```

## Risks
- Signed URLs expire after 1 day — images won't load after expiry
- Large images may cause layout shifts
- No image caching strategy (browser caches by URL)
- Session history with many images may be slow to load

## Rollback Notes
- Revert MessageBubble.tsx to original rendering
- Revert useSessionStore.ts changes

## Verification
1. Run `cd frontend && npx tsc --noEmit` to verify no type errors
2. Send a message with image → verify image displays in user bubble
3. Switch to another session and back → verify image still shows (if URL not expired)
4. Test with long text + image → verify layout is correct
5. Test with image only (no text) → verify only image shows
6. Click image → verify it opens in new tab
