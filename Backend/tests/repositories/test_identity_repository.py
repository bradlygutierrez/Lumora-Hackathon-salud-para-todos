import pytest

from lumora_api.models import Persona
from lumora_api.repositories.identity_repository import IdentityRepository


@pytest.mark.asyncio
async def test_repository_filters_soft_deleted_rows(session_factory):
    async with session_factory() as session:
        repository = IdentityRepository(session, Persona)
        person = await repository.create({"nombres": "Ana", "apellidos": "López"})
        await session.commit()
        await repository.soft_delete(person)
        await session.commit()

        assert await repository.get(person.id) is None
        assert (await repository.list(20, 0))[1] == 0
        assert await session.get(Persona, person.id) is not None
