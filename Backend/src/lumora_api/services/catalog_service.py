from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models.catalogs import CatalogModel
from lumora_api.repositories.catalog_repository import CatalogRepository

ModelT = TypeVar("ModelT", bound=CatalogModel)


class CatalogService(Generic[ModelT]):
    def __init__(self, repository: CatalogRepository[ModelT]) -> None:
        self.repository = repository

    async def list(
        self, limit: int, offset: int, activo: bool | None = None
    ) -> tuple[list[ModelT], int]:
        return await self.repository.list(limit, offset, activo)

    async def get(self, item_id: int) -> ModelT:
        item = await self.repository.get(item_id)
        if item is None:
            raise ResourceNotFoundError(
                f"{self.repository.model.resource_name} con id {item_id} no existe"
            )
        return item

    async def create(self, data: BaseModel) -> ModelT:
        try:
            item = await self.repository.create(data.model_dump())
            await self.repository.session.commit()
            return item
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError(
                f"Ya existe {self.repository.model.resource_name.lower()} con ese nombre"
            ) from error

    async def update(self, item_id: int, data: BaseModel) -> ModelT:
        item = await self.get(item_id)
        try:
            item = await self.repository.update(
                item, data.model_dump(exclude_unset=True, exclude_none=True)
            )
            await self.repository.session.commit()
            return item
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError(
                f"Ya existe {self.repository.model.resource_name.lower()} con ese nombre"
            ) from error

    async def delete(self, item_id: int) -> None:
        item = await self.get(item_id)
        if hasattr(item, "activo"):
            await self.repository.deactivate(item)
        else:
            await self.repository.delete(item)
        await self.repository.session.commit()
