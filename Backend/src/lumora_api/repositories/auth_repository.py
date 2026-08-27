from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import (
    Rol,
    Sexo,
    TipoSangre,
    TokenRecuperacion,
    Usuario,
    UsuarioMetodoMfa,
    VerificacionCorreo,
    SesionUsuario,
)


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

    async def user_by_username(self, username: str) -> Usuario | None:
        return await self.session.scalar(
            select(Usuario).where(Usuario.username == username.lower())
        )

    async def patient_role(self) -> Rol | None:
        return await self.session.scalar(select(Rol).where(Rol.nombre == "Paciente"))

    async def sex_exists(self, sex_id: int) -> bool:
        return await self.session.get(Sexo, sex_id) is not None

    async def blood_type_exists(self, blood_type_id: int) -> bool:
        return await self.session.get(TipoSangre, blood_type_id) is not None

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

    async def verification_by_user_hash(
        self, user_id: int, token_hash: str
    ) -> VerificacionCorreo | None:
        return await self.session.scalar(
            select(VerificacionCorreo).where(
                VerificacionCorreo.usuario_id == user_id,
                VerificacionCorreo.token_hash == token_hash,
            ).with_for_update()
        )

    async def latest_verification(self, user_id: int) -> VerificacionCorreo | None:
        return await self.session.scalar(
            select(VerificacionCorreo)
            .where(VerificacionCorreo.usuario_id == user_id)
            .order_by(VerificacionCorreo.created_at.desc())
            .limit(1)
        )

    async def consume_verifications(self, user_id: int) -> None:
        await self.session.execute(
            update(VerificacionCorreo)
            .where(
                VerificacionCorreo.usuario_id == user_id,
                VerificacionCorreo.consumed_at.is_(None),
            )
            .values(consumed_at=datetime.now(timezone.utc))
        )

    async def has_active_mfa(self, user_id: int) -> bool:
        return (
            await self.session.scalar(
                select(UsuarioMetodoMfa.id).where(
                    UsuarioMetodoMfa.usuario_id == user_id,
                    UsuarioMetodoMfa.activo.is_(True),
                )
            )
            is not None
        )

    async def session_by_hash(self, token_hash: str) -> SesionUsuario | None:
        return await self.session.scalar(
            select(SesionUsuario).where(SesionUsuario.refresh_token_hash == token_hash).with_for_update()
        )

    async def active_session(self, session_id: int, user_id: int) -> SesionUsuario | None:
        return await self.session.scalar(
            select(SesionUsuario).where(
                SesionUsuario.id == session_id,
                SesionUsuario.usuario_id == user_id,
                SesionUsuario.revoked_at.is_(None),
                SesionUsuario.expires_at > datetime.now(timezone.utc),
            )
        )

    async def active_sessions(self, user_id: int) -> list[SesionUsuario]:
        return list(await self.session.scalars(
            select(SesionUsuario).where(
                SesionUsuario.usuario_id == user_id,
                SesionUsuario.revoked_at.is_(None),
                SesionUsuario.expires_at > datetime.now(timezone.utc),
            ).order_by(SesionUsuario.created_at.desc())
        ))

    async def revoke_all(self, user_id: int) -> None:
        await self.session.execute(
            update(SesionUsuario).where(
                SesionUsuario.usuario_id == user_id,
                SesionUsuario.revoked_at.is_(None),
            ).values(revoked_at=datetime.now(timezone.utc))
        )

    async def revoke_others(self, user_id: int, current_session_id: int) -> None:
        await self.session.execute(
            update(SesionUsuario).where(
                SesionUsuario.usuario_id == user_id,
                SesionUsuario.id != current_session_id,
                SesionUsuario.revoked_at.is_(None),
            ).values(revoked_at=datetime.now(timezone.utc))
        )
