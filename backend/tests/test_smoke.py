"""
Smoke tests — verify critical endpoints respond without 500 errors.

These run in CI on every push. They catch import errors, broken routes,
missing columns, and startup failures BEFORE code reaches production.
"""


def test_health(client):
    """App boots and health endpoint responds."""
    r = client.get("/health")
    assert r.status_code == 200


def test_docs_reachable(client):
    """OpenAPI docs render (catches import/schema errors)."""
    r = client.get("/docs")
    assert r.status_code == 200


def test_openapi_json(client):
    """OpenAPI schema generates without error (catches Pydantic model issues)."""
    r = client.get("/openapi.json")
    assert r.status_code == 200
    data = r.json()
    assert "paths" in data
    assert len(data["paths"]) > 0


def test_unauthenticated_routes_reject_properly(client):
    """Protected routes reject unauthenticated requests (not 500)."""
    protected = [
        ("GET",  "/users/me"),
        ("GET",  "/users/student-profile"),
        ("GET",  "/leaderboards/overall"),
        ("GET",  "/exams/"),
    ]
    for method, path in protected:
        r = getattr(client, method.lower())(path)
        assert r.status_code < 500, \
            f"{method} {path} returned {r.status_code} — server error!"


def test_papers_preview_rejects_invalid_body(client):
    """POST /papers/preview with empty body returns 422, not 500."""
    r = client.post("/papers/preview", json={})
    assert r.status_code == 422
