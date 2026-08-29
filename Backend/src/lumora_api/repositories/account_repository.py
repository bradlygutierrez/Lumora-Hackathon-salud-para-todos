from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, with_loader_criteria

from lumora_api.models import Direccion, Sexo, Usuario


class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, user_id: int) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario)
            .options(
                selectinload(Usuario.persona).selectinload(Usuario.persona.property.mapper.class_.direcciones),
                selectinload(Usuario.roles),
                with_loader_criteria(Direccion, Direccion.deleted_at.is_(None)),
            )
            .execution_options(populate_existing=True)
            .where(Usuario.id == user_id, Usuario.activo.is_(True), Usuario.deleted_at.is_(None))
        )

    async def username_taken(self, username: str, user_id: int) -> bool:
        return await self.session.scalar(
            select(Usuario.id).where(Usuario.username == username, Usuario.id != user_id)
        ) is not None

    async def email_taken(self, email: str, user_id: int) -> bool:
        return await self.session.scalar(
            select(Usuario.id).where(Usuario.email == email, Usuario.id != user_id)
        ) is not None

    async def sex_exists(self, sex_id: int) -> bool:
        return await self.session.scalar(select(Sexo.id).where(Sexo.id == sex_id)) is not None
