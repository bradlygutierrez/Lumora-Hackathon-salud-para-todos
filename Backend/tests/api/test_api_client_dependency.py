import pytest

from lumora_api.api.dependencies import identify_api_client
from lumora_api.core.exceptions import AuthenticationError
from lumora_api.repositories.api_client_repository import ApiClientRepository
from lumora_api.services.api_client_service import ApiClientService


@pytest.mark.asyncio
async def test_missing_api_key_header_is_rejected(session_factory):
    async with session_factory() as session:
        with pytest.raises(AuthenticationError):
            await identify_api_client(session, None)


@pytest.mark.asyncio
async def test_unknown_api_key_is_rejected(session_factory):
    async with session_factory() as session:
        with pytest.raises(AuthenticationError):
            await identify_api_client(session, "lumk_not-a-real-key")


@pytest.mark.asyncio
async def test_valid_api_key_resolves_the_client(session_factory):
    async with session_factory() as session:
        service = ApiClientService(ApiClientRepository(session))
        client = await service.create_client("lumora-app", "Lumora paciente/cuidador")
        _, raw_key = await service.issue_key(client.id)

    async with session_factory() as session:
        resolved = await identify_api_client(session, raw_key)
        assert resolved.client_id == "lumora-app"
