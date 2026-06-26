# Phase 4: Frontend Types & State Management

## Goal
Update TypeScript types and reducer to support image attachments in messages.

## Files to Change
- `frontend/lib/types.ts` — add image fields to Message type and ChatAction
- `frontend/hooks/useChatReducer.ts` — handle image in ADD_USER_MESSAGE action

## Implementation Steps

### 4.1 Update Message Type (frontend/lib/types.ts)
Add imageUrl field to Message interface:

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  status: MessageStatus;
  errorMessage?: string;
  warningMessage?: string;
  imageUrl?: string;  // NEW: URL of uploaded image (user messages only)
}
```

### 4.2 Update ChatAction (frontend/lib/types.ts)
Add imageUrl to ADD_USER_MESSAGE action:

```typescript
export type ChatAction =
  | { type: 'ADD_USER_MESSAGE'; text: string; imageUrl?: string }
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
  | { type: 'SET_SESSION_ID'; sessionId: string };
```

### 4.3 Update Reducer (frontend/hooks/useChatReducer.ts)
Modify ADD_USER_MESSAGE case to include imageUrl:

```typescript
case 'ADD_USER_MESSAGE': {
  const userMessage = createMessage({
    role: 'user',
    content: action.text,
    status: 'done',
    imageUrl: action.imageUrl,  // NEW
  });
  return {
    ...state,
    messages: [...state.messages, userMessage],
  };
}
```

### 4.4 Update addUserMessage Callback (frontend/hooks/useChatReducer.ts)
Add imageUrl parameter:

```typescript
const addUserMessage = useCallback(
  (text: string, imageUrl?: string) =>
    dispatch({ type: 'ADD_USER_MESSAGE', text, imageUrl }),
  []
);
```

## Risks
- Breaking change: all callers of addUserMessage must be updated
- Session loading must handle imageUrl field (may be undefined in old data)

## Rollback Notes
- Revert types.ts to original Message interface
- Revert useChatReducer.ts changes

## Verification
1. Run `cd frontend && npx tsc --noEmit` to verify no type errors
2. Verify existing text-only messages still render correctly
3. Check that old sessions without imageUrl load without errors
