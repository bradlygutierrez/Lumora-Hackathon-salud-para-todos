from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from lumora_api.models import Rol, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository


class UserRepository(IdentityRepository[Usuario]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Usuario)

    async def list_admins(self, limit: int, offset: int) -> tuple[list[Usuario], int]:
        active = Usuario.deleted_at.is_(None)
        items = list(await self.session.scalars(
            select(Usuario).join(Usuario.roles).where(active, Rol.nombre == "Administrador").order_by(Usuario.id).limit(limit).offset(offset)
        ))
        total = await self.session.scalar(
            select(func.count()).select_from(Usuario).join(Usuario.roles).where(active, Rol.nombre == "Administrador")
        )
        return items, total or 0

    async def role_by_name(self, name: str) -> Rol | None:
        return await self.session.scalar(select(Rol).where(Rol.nombre == name))
