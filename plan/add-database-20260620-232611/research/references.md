# References

## SQLAlchemy 2.0 Async with FastAPI
- Official docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- FastAPI SQL guide: https://fastapi.tiangolo.com/how-to/async-sql-databases/
- Pattern: async engine + `AsyncSession` + `Depends(get_db)`

## Alembic
- Official docs: https://alembic.sqlalchemy.org/
- Async support: https://alembic.sqlalchemy.org/en/latest/async.html
- Pattern: `alembic init`, `alembic revision --autogenerate`, `alembic upgrade head`

## JWT Auth with FastAPI
- FastAPI security guide: https://fastapi.tiangolo.com/tutorial/security/
- python-jose: https://python-jose.readthedocs.io/
- Pattern: `OAuth2PasswordBearer` + `Depends(get_current_user)`

## SQLite + WAL Mode
- WAL docs: https://www.sqlite.org/wal.html
- SQLAlchemy WAL: `PRAGMA journal_mode=WAL` on connect

## passlib + bcrypt
- passlib docs: https://passlib.readthedocs.io/
- Pattern: `CryptContext(schemes=["bcrypt"])`
