import pytest

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import CargoSalud, TipoCita
from lumora_api.repositories.catalog_repository import CatalogRepository
from lumora_api.schemas import ActiveCatalogCreate, CatalogCreate
from lumora_api.services.catalog_service import CatalogService


@pytest.mark.asyncio
async def test_service_translates_missing_and_unique_errors(session_factory):
    async with session_factory() as session:
        service = CatalogService(CatalogRepository(session, TipoCita))
        with pytest.raises(ResourceNotFoundError):
            await service.get(999)
        await service.create(CatalogCreate(nombre="Virtual"))
        with pytest.raises(ResourceConflictError):
            await service.create(CatalogCreate(nombre="Virtual"))


@pytest.mark.asyncio
async def test_service_deactivates_active_catalog_instead_of_deleting(session_factory):
    async with session_factory() as session:
        service = CatalogService(CatalogRepository(session, CargoSalud))
        item = await service.create(ActiveCatalogCreate(nombre="Enfermería"))
        await service.delete(item.id)
        deactivated = await service.get(item.id)

    assert deactivated.activo is False
