from datetime import datetime, timezone
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models.identity import SoftDeleteMixin

ModelT = TypeVar("ModelT", bound=SoftDeleteMixin)


class IdentityRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def list(self, limit: int, offset: int) -> tuple[list[ModelT], int]:
        active = self.model.deleted_at.is_(None)
        items = list(
            await self.session.scalars(
                select(self.model)
                .where(active)
                .order_by(self.model.id)
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(
            select(func.count()).select_from(self.model).where(active)
        )
        return items, total or 0

    async def get(self, item_id: int) -> ModelT | None:
        return await self.session.scalar(
            select(self.model).where(
                self.model.id == item_id, self.model.deleted_at.is_(None)
            )
        )

    async def create(self, values: dict) -> ModelT:
        item = self.model(**values)
        self.session.add(item)
        return item

    async def update(self, item: ModelT, values: dict) -> ModelT:
        for field, value in values.items():
            setattr(item, field, value)
        return item

    async def soft_delete(self, item: ModelT) -> None:
        item.deleted_at = datetime.now(timezone.utc)
