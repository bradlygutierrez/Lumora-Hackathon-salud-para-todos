from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from lumora_api.models import Rol, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository


class UserRepository(IdentityRepository[Usuario]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Usuario)

    async def role_by_name(self, name: str) -> Rol | None:
        return await self.session.scalar(select(Rol).where(Rol.nombre == name))
