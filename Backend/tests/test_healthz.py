import pytest
from httpx import ASGITransport, AsyncClient

from lumora_api.db.session import get_session
from lumora_api.main import app


@pytest.mark.asyncio
async def test_healthz_reports_ok_when_the_database_is_reachable(client):
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_healthz_reports_unavailable_when_the_database_is_unreachable():
    async def broken_session():
        class _Broken:
            async def execute(self, *args, **kwargs):
                raise ConnectionError("no route to database")

        yield _Broken()

    app.dependency_overrides[get_session] = broken_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as broken_client:
            response = await broken_client.get("/healthz")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}


@pytest.mark.asyncio
async def test_healthz_is_excluded_from_the_public_schema():
    assert "/healthz" not in app.openapi()["paths"]
