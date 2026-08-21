from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import TokenRecuperacion, Usuario, VerificacionCorreo


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def user_by_id(self, user_id: int) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario).where(
                Usuario.id == user_id,
                Usuario.activo.is_(True),
                Usuario.deleted_at.is_(None),
            )
        )

    async def user_by_login(self, login: str) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario).where(
                (Usuario.username == login.lower()) | (Usuario.email == login.lower()),
                Usuario.activo.is_(True),
                Usuario.deleted_at.is_(None),
            )
        )

    async def user_by_email(self, email: str) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario).where(
                Usuario.email == email.lower(),
                Usuario.activo.is_(True),
                Usuario.deleted_at.is_(None),
            )
        )

    async def recovery_by_hash(self, token_hash: str) -> TokenRecuperacion | None:
        return await self.session.scalar(
            select(TokenRecuperacion).where(TokenRecuperacion.token_hash == token_hash)
        )

    async def verification_by_hash(self, token_hash: str) -> VerificacionCorreo | None:
        return await self.session.scalar(
            select(VerificacionCorreo).where(
                VerificacionCorreo.token_hash == token_hash
            )
        )
