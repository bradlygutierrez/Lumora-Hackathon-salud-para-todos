from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import (
    CodigoRecuperacionMfa,
    DesafioAutenticacion,
    MetodoMfa,
    UsuarioMetodoMfa,
)


class MfaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def configured_methods(self, user_id: int) -> list[UsuarioMetodoMfa]:
        return list(
            await self.session.scalars(
                select(UsuarioMetodoMfa)
                .where(UsuarioMetodoMfa.usuario_id == user_id)
                .order_by(UsuarioMetodoMfa.id)
            )
        )

    async def configured_method(
        self, user_id: int, configured_id: int
    ) -> UsuarioMetodoMfa | None:
        return await self.session.scalar(
            select(UsuarioMetodoMfa).where(
                UsuarioMetodoMfa.id == configured_id,
                UsuarioMetodoMfa.usuario_id == user_id,
            )
        )

    async def by_catalog_method(
        self, user_id: int, method_id: int
    ) -> UsuarioMetodoMfa | None:
        return await self.session.scalar(
            select(UsuarioMetodoMfa).where(
                UsuarioMetodoMfa.usuario_id == user_id,
                UsuarioMetodoMfa.metodo_id == method_id,
            )
        )

    async def active_method(self, user_id: int) -> UsuarioMetodoMfa | None:
        return await self.session.scalar(
            select(UsuarioMetodoMfa).where(
                UsuarioMetodoMfa.usuario_id == user_id,
                UsuarioMetodoMfa.activo.is_(True),
            )
        )

    async def catalog_method(self, method_id: int) -> MetodoMfa | None:
        return await self.session.get(MetodoMfa, method_id)

    async def challenge(self, challenge_hash: str) -> DesafioAutenticacion | None:
        return await self.session.scalar(
            select(DesafioAutenticacion)
            .where(DesafioAutenticacion.desafio_hash == challenge_hash)
            .with_for_update()
        )

    async def recovery_code(
        self, configured_id: int, code_hash: str
    ) -> CodigoRecuperacionMfa | None:
        return await self.session.scalar(
            select(CodigoRecuperacionMfa)
            .where(
                CodigoRecuperacionMfa.usuario_metodo_id == configured_id,
                CodigoRecuperacionMfa.codigo_hash == code_hash,
            )
            .with_for_update()
        )

    async def delete_recovery_codes(self, configured_id: int) -> None:
        await self.session.execute(
            delete(CodigoRecuperacionMfa).where(
                CodigoRecuperacionMfa.usuario_metodo_id == configured_id
            )
        )

    async def consume_open_challenges(self, configured_id: int) -> None:
        from datetime import datetime, timezone

        await self.session.execute(
            update(DesafioAutenticacion)
            .where(
                DesafioAutenticacion.usuario_metodo_id == configured_id,
                DesafioAutenticacion.consumed_at.is_(None),
            )
            .values(consumed_at=datetime.now(timezone.utc))
        )
