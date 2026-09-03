import pytest

from lumora_api.repositories.api_client_repository import ApiClientRepository
from lumora_api.services.api_client_service import ApiClientService


async def _service(session_factory):
    session = session_factory()
    return ApiClientService(ApiClientRepository(session))


@pytest.mark.asyncio
async def test_resolve_returns_client_for_a_valid_key_and_records_usage(session_factory):
    service = await _service(session_factory)
    client = await service.create_client("lumora-health-staff", "Lumora Health Staff")
    key, raw_key = await service.issue_key(client.id)
    assert key.last_used_at is None

    resolved = await service.resolve(raw_key)

    assert resolved is not None
    assert resolved.client_id == "lumora-health-staff"
    keys = await service.list_keys(client.id)
    assert keys[0].last_used_at is not None


@pytest.mark.asyncio
async def test_resolve_returns_none_for_an_unknown_key(session_factory):
    service = await _service(session_factory)
    assert await service.resolve("lumk_does-not-exist") is None


@pytest.mark.asyncio
async def test_resolve_returns_none_for_a_revoked_key(session_factory):
    service = await _service(session_factory)
    client = await service.create_client("lumora-web", "Portal interno")
    key, raw_key = await service.issue_key(client.id)

    await service.revoke_key(client.id, key.id)

    assert await service.resolve(raw_key) is None


@pytest.mark.asyncio
async def test_resolve_returns_none_when_the_client_is_deactivated(session_factory):
    service = await _service(session_factory)
    client = await service.create_client("lumora-app", "Lumora paciente/cuidador")
    _, raw_key = await service.issue_key(client.id)

    await service.update_client(client.id, activo=False)

    assert await service.resolve(raw_key) is None


@pytest.mark.asyncio
async def test_key_rotation_keeps_the_old_key_valid_until_revoked(session_factory):
    service = await _service(session_factory)
    client = await service.create_client("lumora-app", "Lumora paciente/cuidador")
    old_key, old_raw = await service.issue_key(client.id)
    _, new_raw = await service.issue_key(client.id)

    assert (await service.resolve(old_raw)) is not None
    assert (await service.resolve(new_raw)) is not None

    await service.revoke_key(client.id, old_key.id)

    assert await service.resolve(old_raw) is None
    assert (await service.resolve(new_raw)) is not None


@pytest.mark.asyncio
async def test_create_client_rejects_a_duplicate_client_id(session_factory):
    from lumora_api.core.exceptions import ResourceConflictError

    service = await _service(session_factory)
    await service.create_client("lumora-app", "Lumora paciente/cuidador")
    with pytest.raises(ResourceConflictError):
        await service.create_client("lumora-app", "Otro nombre")
