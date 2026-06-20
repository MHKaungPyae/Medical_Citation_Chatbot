# Phase 1: Database Foundation

## Goal
Set up SQLAlchemy models, async engine, and Alembic migrations.

## Files to Create

### `backend/database.py`
- SQLAlchemy async engine with `aiosqlite` driver.
- `DATABASE_URL` from `config.py` (default: `sqlite+aiosqlite:///./backend/chatbot.db`).
- `AsyncSessionLocal` session factory.
- `Base` declarative base.
- `get_db()` async generator for FastAPI dependency injection.
- WAL mode pragma on connect.

### `backend/models.py`
- `User` model: id (UUID PK), email (unique, indexed), password_hash, display_name, created_at, updated_at.
- `ChatSession` model: id (UUID PK), user_id (FK users.id, indexed), title, created_at, updated_at.
- `Message` model: id (UUID PK), session_id (FK chat_sessions.id, indexed), role, content, citations_json (Text, nullable), created_at.
- All IDs default to `uuid.uuid4().hex`.
- Timestamps default to `datetime.utcnow`.

### `alembic.ini`
- `sqlalchemy.url` pointing to `sqlite+aiosqlite:///./backend/chatbot.db`.
- Script location: `alembic`.

### `alembic/env.py`
- Import `Base` from `backend.models`.
- Set `target_metadata = Base.metadata`.
- Configure async engine for migrations.

### `alembic/versions/001_initial.py`
- Auto-generated migration creating `users`, `chat_sessions`, `messages` tables.

## Files to Modify

### `backend/config.py`
Add:
```python
DATABASE_URL = "sqlite+aiosqlite:///./backend/chatbot.db"
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
```

### `backend/requirements.txt`
Add:
```
sqlalchemy[asyncio]>=2.0
aiosqlite>=0.20
alembic>=1.13
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
```

## Verification
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
alembic upgrade head
python -c "
import sqlite3
conn = sqlite3.connect('backend/chatbot.db')
tables = conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()
print('Tables:', tables)
conn.close()
"
# Expected: [('alembic_version',), ('users',), ('chat_sessions',), ('messages',)]
```

## Done Criteria
- [ ] `backend/database.py` exists with async engine and session factory
- [ ] `backend/models.py` exists with User, ChatSession, Message models
- [ ] `alembic.ini` and `alembic/` directory exist
- [ ] `alembic upgrade head` creates all 3 tables
- [ ] All imports use `from backend.xxx import ...`
