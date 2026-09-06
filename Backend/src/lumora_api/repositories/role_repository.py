from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import Permiso, Rol
from lumora_api.repositories.catalog_repository import CatalogRepository


class RoleRepository(CatalogRepository[Rol]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Rol)

    async def permissions(self, permission_ids: list[int]) -> list[Permiso]:
        if not permission_ids:
            return []
        return list(
            await self.session.scalars(
                select(Permiso).where(Permiso.id.in_(set(permission_ids)))
            )
        )
