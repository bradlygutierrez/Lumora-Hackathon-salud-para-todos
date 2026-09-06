from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models.catalogs import CatalogModel

ModelT = TypeVar("ModelT", bound=CatalogModel)


class CatalogRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def list(
        self, limit: int, offset: int, activo: bool | None = None
    ) -> tuple[list[ModelT], int]:
        query = select(self.model).order_by(self.model.id).limit(limit).offset(offset)
        count_query = select(func.count()).select_from(self.model)
        if activo is not None and hasattr(self.model, "activo"):
            query = query.where(self.model.activo == activo)
            count_query = count_query.where(self.model.activo == activo)

        items = list(await self.session.scalars(query))
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def get(self, item_id: int) -> ModelT | None:
        return await self.session.get(self.model, item_id)

    async def create(self, values: dict) -> ModelT:
        item = self.model(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update(self, item: ModelT, values: dict) -> ModelT:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def delete(self, item: ModelT) -> None:
        await self.session.delete(item)
        await self.session.flush()

    async def deactivate(self, item: ModelT) -> ModelT:
        item.activo = False
        await self.session.flush()
        await self.session.refresh(item)
        return item
