# Phase 7: Unit Tests

**Status:** 🔲 Not started

## Goal
Add automated test coverage for backend and frontend.

## Steps

### Backend (`pytest-httpx`)

1. Create `backend/tests/conftest.py` — shared fixtures (mock httpx client, mock Supabase)
2. Create `backend/tests/test_wiki_client.py`:
   - Mock MediaWiki API responses
   - Test search + extract parsing
   - Test error handling (timeout, empty results)
3. Create `backend/tests/test_openfda_client.py`:
   - Mock FDA API responses
   - Test OTC vs Rx field extraction
   - Test drug_interactions inclusion
   - Test DailyMed URL generation
4. Create `backend/tests/test_session_store.py`:
   - Mock Supabase client
   - Test get_history, save, save_citations
5. Create `backend/tests/test_symptom_pipeline.py`:
   - Mock all external calls
   - Verify prompt assembly
   - Test citation normalization
   - Test drug extraction (3-pass)
6. Create `backend/tests/test_auth.py`:
   - JWT verification with valid/invalid/expired tokens
   - get_current_user dependency

### Frontend (`vitest` + MSW)

1. Create `frontend/hooks/__tests__/useChatReducer.test.ts`:
   - All 12 action types
   - Citation persistence bug regression
2. Create `frontend/hooks/__tests__/useSessionStore.test.ts`:
   - API call mocking
   - Error handling
3. Create `frontend/components/__tests__/MessageBubble.test.tsx`:
   - Citation rendering
   - Source coercion

## Verification
```bash
# Backend
cd /Users/panda/Desktop/Medical_Citation_Chatbot
source backend/.venv/bin/activate
PYTHONPATH=. pytest backend/tests/ -v

# Frontend
cd frontend
npm test
```

## Files to Create
- `backend/tests/conftest.py`
- `backend/tests/test_wiki_client.py`
- `backend/tests/test_openfda_client.py`
- `backend/tests/test_session_store.py`
- `backend/tests/test_symptom_pipeline.py`
- `backend/tests/test_auth.py`
- `frontend/hooks/__tests__/useChatReducer.test.ts`
- `frontend/hooks/__tests__/useSessionStore.test.ts`
- `frontend/components/__tests__/MessageBubble.test.tsx`
