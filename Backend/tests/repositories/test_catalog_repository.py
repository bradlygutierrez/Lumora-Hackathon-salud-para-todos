import pytest

from lumora_api.models import CargoSalud, EstadoCita
from lumora_api.repositories.catalog_repository import CatalogRepository


@pytest.mark.asyncio
async def test_repository_lists_with_total(session_factory):
    async with session_factory() as session:
        repository = CatalogRepository(session, EstadoCita)
        await repository.create({"nombre": "Pendiente"})
        await repository.create({"nombre": "Confirmada"})
        await session.commit()
        items, total = await repository.list(limit=1, offset=1)

    assert total == 2
    assert [item.nombre for item in items] == ["Confirmada"]


@pytest.mark.asyncio
async def test_repository_filters_active_catalogs(session_factory):
    async with session_factory() as session:
        repository = CatalogRepository(session, CargoSalud)
        await repository.create({"nombre": "Médico", "activo": True})
        await repository.create({"nombre": "Archivado", "activo": False})
        await session.commit()
        items, total = await repository.list(limit=20, offset=0, activo=True)

    assert total == 1
    assert [item.nombre for item in items] == ["Médico"]
