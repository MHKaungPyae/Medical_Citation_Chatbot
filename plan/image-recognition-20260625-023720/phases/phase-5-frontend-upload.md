# Phase 5: Frontend Image Upload UI & Stream Integration

## Goal
Add image upload button, preview, and modify the stream to send multipart/form-data.

## Files to Change
- `frontend/hooks/useChatController.ts` — add image state management
- `frontend/hooks/useChatStream.ts` — modify to send FormData
- `frontend/components/ChatContainer.tsx` — add image upload button and preview
- `frontend/components/ImagePreview.tsx` (new) — image preview component
- `frontend/components/AutoExpandTextarea.tsx` — add attachment button
- `frontend/lib/constants.ts` — add image-related constants

## Implementation Steps

### 5.1 Add Image State to Controller (frontend/hooks/useChatController.ts)
Add state for selected image:

```typescript
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

// Handle image selection
const handleImageSelect = useCallback((file: File) => {
  setSelectedImage(file);
  // Create preview URL
  const url = URL.createObjectURL(file);
  setImagePreviewUrl(url);
}, []);

// Clear selected image
const handleClearImage = useCallback(() => {
  setSelectedImage(null);
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  }
}, [imagePreviewUrl]);

// Clean up preview URL on unmount
useEffect(() => {
  return () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
  };
}, [imagePreviewUrl]);
```

### 5.2 Update handleSend (frontend/hooks/useChatController.ts)
Pass image to sendMessage:

```typescript
const handleSend = useCallback(() => {
  if ((!inputValue.trim() && !selectedImage) || state.isStreaming) return;
  const query = inputValue.trim();
  setInputValue('');
  sendMessage(query, selectedImage || undefined);
  handleClearImage();
}, [inputValue, selectedImage, state.isStreaming, sendMessage, handleClearImage]);
```

### 5.3 Modify useChatStream (frontend/hooks/useChatStream.ts)
Update sendMessage to accept optional image and use FormData:

```typescript
const sendMessage = useCallback(
  async (query: string, image?: File) => {
    if (isStreamingRef.current) {
      cancelStream();
    }

    const trimmed = query.trim();
    if (!trimmed && !image) return;

    // Get signed URL for image (if present) before sending
    let imageUrl: string | undefined;
    
    // Optimistic user message (show local preview)
    addUserMessage(trimmed, image ? URL.createObjectURL(image) : undefined);

    // Create empty assistant bubble
    createAssistantMessage();

    // Show searching status
    setStatus(STATUS_MESSAGES.SEARCHING);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isStreamingRef.current = true;

    try {
      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append('query', trimmed);
      formData.append('session_id', sessionId);
      if (image) {
        formData.append('image', image);
      }

      const response = await authenticatedFetch(`${API_URL}/api/chat`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser sets it with boundary
        signal: controller.signal,
      });

      // ... rest of existing response handling ...
    }
    // ... catch block ...
  },
  [/* existing deps + addUserMessage */]
);
```

### 5.4 Update addUserMessage Call
The addUserMessage signature changed in Phase 4. Update the call to pass imageUrl:

```typescript
addUserMessage(trimmed, image ? URL.createObjectURL(image) : undefined);
```

### 5.5 Create ImagePreview Component (frontend/components/ImagePreview.tsx)
```tsx
'use client';

import React from 'react';
import { IconClose } from './Icons';

interface ImagePreviewProps {
  imageUrl: string;
  onRemove: () => void;
}

export default function ImagePreview({ imageUrl, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <img
        src={imageUrl}
        alt="Upload preview"
        className="h-20 w-20 rounded-lg object-cover"
      />
      <button
        onClick={onRemove}
        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
        aria-label="Remove image"
      >
        <IconClose size={12} />
      </button>
    </div>
  );
}
```

### 5.6 Update ChatContainer (frontend/components/ChatContainer.tsx)
Add image props and render preview:

```tsx
interface ChatContainerProps {
  // ... existing props ...
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  onImageSelect: (file: File) => void;
  onClearImage: () => void;
}

// In the render:
<div className="sticky bottom-0 px-4 py-3" style={{...}}>
  {/* Image preview */}
  {imagePreviewUrl && (
    <div className="mx-auto max-w-3xl mb-2 px-4">
      <ImagePreview imageUrl={imagePreviewUrl} onRemove={onClearImage} />
    </div>
  )}
  
  <div className="mx-auto flex max-w-3xl items-end gap-2 ...">
    {/* Hidden file input */}
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
    />
    
    {/* Attachment button */}
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={isStreaming}
      className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
      aria-label="Attach image"
    >
      <IconAttach size={20} />
    </button>
    
    <AutoExpandTextarea ... />
    <SendButton ... />
  </div>
</div>
```

### 5.7 Add Icon (frontend/components/Icons.tsx)
Add attachment icon:

```tsx
export function IconAttach({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
```

### 5.8 Update Constants (frontend/lib/constants.ts)
Add image-related constants:

```typescript
export const IMAGE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_DIMENSION: 1024, // Resize before upload
};
```

## Risks
- FormData removes Content-Type header — browser must set it with boundary
- Large images may cause slow uploads — need progress indicator
- Preview URL must be revoked to prevent memory leaks
- File input onChange must handle same file re-selection

## Rollback Notes
- Revert useChatStream.ts to JSON body
- Revert useChatController.ts to remove image state
- Remove ImagePreview.tsx
- Revert ChatContainer.tsx props

## Verification
1. Run `cd frontend && npx tsc --noEmit` to verify no type errors
2. Run `cd frontend && npm run dev` and test:
   - Click attach button → file picker opens
   - Select image → preview shows
   - Click remove → preview clears
   - Send with image → multipart request sent
   - Send without image → JSON request sent (backward compat)
3. Check browser Network tab: request should be multipart/form-data
