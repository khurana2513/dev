"""
Pytest configuration and shared fixtures for backend tests.

Provides:
  - A fresh test database (SQLite in-memory) for each test session
  - A TestClient that talks to the FastAPI app
  - An authenticated client helper with a fake JWT

Run: cd backend && pytest tests/ -v
"""
import os
import sys

# ── Set test environment BEFORE any app imports ──────────────────────────────
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key-do-not-use-in-production"
os.environ["GOOGLE_CLIENT_ID"] = "fake-client-id"
os.environ["GOOGLE_CLIENT_SECRET"] = "fake-client-secret"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"
os.environ["ADMIN_EMAILS"] = "admin@test.com"

# Add backend dir to path so `import models` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from models import Base
from main import app, get_db


# ── Test database ────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once per test session, drop after."""
    from sqlalchemy import event, text

    @event.listens_for(test_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=OFF")

    # Our models have duplicate index names across tables (allowed in Postgres
    # but not SQLite). Deduplicate them in metadata before creating tables.
    seen_index_names: set[str] = set()
    for table in Base.metadata.sorted_tables:
        deduped = []
        for idx in table.indexes:
            if idx.name in seen_index_names:
                idx.name = f"{table.name}_{idx.name}"
            seen_index_names.add(idx.name)
            deduped.append(idx)

    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db():
    """Provide a clean database session, rolled back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client():
    """Unauthenticated test client."""
    with TestClient(app) as c:
        yield c
