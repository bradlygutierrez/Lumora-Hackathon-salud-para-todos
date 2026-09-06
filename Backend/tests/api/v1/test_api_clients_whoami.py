import pytest

from lumora_api.repositories.api_client_repository import ApiClientRepository
from lumora_api.services.api_client_service import ApiClientService


@pytest.mark.asyncio
async def test_whoami_requires_the_x_api_key_header(client):
    response = await client.get("/api/v1/clientes-api/whoami")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_whoami_rejects_an_unknown_key(client):
    response = await client.get(
        "/api/v1/clientes-api/whoami", headers={"X-API-Key": "not-a-real-key"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_whoami_resolves_a_key_issued_through_the_admin_endpoint(
    client, session_factory
):
    async with session_factory() as session:
        service = ApiClientService(ApiClientRepository(session))
        db_client = await service.create_client("lumora-app", "Lumora paciente/cuidador")
        _, raw_key = await service.issue_key(db_client.id)

    response = await client.get(
        "/api/v1/clientes-api/whoami", headers={"X-API-Key": raw_key}
    )

    assert response.status_code == 200
    assert response.json() == {
        "client_id": "lumora-app",
        "nombre": "Lumora paciente/cuidador",
        "activo": True,
    }


@pytest.mark.asyncio
async def test_whoami_resolves_the_configured_master_key(client, monkeypatch):
    import lumora_api.api.dependencies as deps_module

    class _FakeSecret:
        def get_secret_value(self) -> str:
            return "the-master-key"

    monkeypatch.setattr(
        deps_module,
        "get_settings",
        lambda: type("S", (), {"api_master_key": _FakeSecret()})(),
    )

    response = await client.get(
        "/api/v1/clientes-api/whoami", headers={"X-API-Key": "the-master-key"}
    )

    assert response.status_code == 200
    assert response.json()["client_id"] == "master"
