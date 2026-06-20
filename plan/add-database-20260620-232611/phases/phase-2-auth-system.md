# Phase 2: Auth System

## Goal
Implement user registration, login, and JWT-based authentication middleware.

## Files to Create

### `backend/auth.py`
- `hash_password(password: str) -> str` — bcrypt hash.
- `verify_password(plain: str, hashed: str) -> bool` — bcrypt verify.
- `create_access_token(user_id: str) -> str` — JWT encode with expiry.
- `decode_access_token(token: str) -> dict | None` — JWT decode, return payload or None.
- `get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User` — FastAPI dependency that extracts user from JWT, returns User ORM object. Raises 401 on invalid/expired token.
- `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")`.

### `backend/routers/__init__.py`
- Empty file for package.

### `backend/routers/auth_routes.py`
- `POST /api/auth/register` — validate email uniqueness, hash password, create User, return JWT.
- `POST /api/auth/login` — find user by email, verify password, return JWT.
- Request/response models via Pydantic.

**Pydantic models:**
```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    id: str
    email: str
    token: str
```

## Files to Modify

### `backend/main.py`
- Import and include `auth_router` from `backend.routers.auth_routes`.
- Add `app.include_router(auth_router, prefix="/api/auth")`.

## Verification
```bash
# Start server
cd /Users/panda/Desktop/Medical_Citation_Chatbot
source backend/.venv/bin/activate
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# Register
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' | python -m json.tool

# Login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' | python -m json.tool

# Duplicate registration (should fail 409)
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## Done Criteria
- [ ] `backend/auth.py` exists with password hashing, JWT, and `get_current_user` dependency
- [ ] `backend/routers/auth_routes.py` exists with register and login endpoints
- [ ] Register returns JWT on success, 409 on duplicate email
- [ ] Login returns JWT on success, 401 on wrong credentials
- [ ] `get_current_user` dependency works when added to protected routes
