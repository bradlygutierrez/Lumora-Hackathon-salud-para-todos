from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import (
    AuthenticationError,
    InvalidTokenError,
    ResourceConflictError,
    ResourceNotFoundError,
    MfaRequiredError,
)
from lumora_api.core.security import (
    create_access_token,
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from lumora_api.models import (
    Permiso,
    Rol,
    TokenRecuperacion,
    Usuario,
    VerificacionCorreo,
    IntentoInicioSesion,
    SesionUsuario,
)
from lumora_api.repositories.auth_repository import AuthRepository


def _expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


class AuthService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    async def authenticate(self, login: str, password: str) -> str:
        user = await self.authenticate_user(login, password)
        if await self.repository.has_active_mfa(user.id):
            raise MfaRequiredError("Se requiere un segundo factor de autenticación")
        return create_access_token(user.id)

    async def authenticate_user(
        self, login: str, password: str, ip: str | None = None, user_agent: str | None = None
    ) -> Usuario:
        user = await self.repository.user_by_login(login)
        if user is None or not verify_password(password, user.password_hash):
            self.repository.session.add(IntentoInicioSesion(
                login=login.lower(), usuario_id=user.id if user else None, exitoso=False,
                motivo="credenciales_incorrectas", ip=ip, user_agent=user_agent,
            ))
            await self.repository.session.commit()
            raise AuthenticationError("Credenciales incorrectas")
        self.repository.session.add(IntentoInicioSesion(
            login=login.lower(), usuario_id=user.id, exitoso=True, ip=ip, user_agent=user_agent,
        ))
        await self.repository.session.commit()
        return user

    async def login(self, login: str, password: str, ip: str | None, user_agent: str | None) -> dict:
        user = await self.authenticate_user(login, password, ip, user_agent)
        if await self.repository.has_active_mfa(user.id):
            raise MfaRequiredError("Se requiere un segundo factor de autenticación")
        return await self.create_session(user.id, ip, user_agent)

    async def create_session(self, user_id: int, ip: str | None, user_agent: str | None) -> dict:
        raw = generate_token()
        session = SesionUsuario(
            usuario_id=user_id, refresh_token_hash=hash_token(raw), ip=ip,
            user_agent=user_agent, expires_at=datetime.now(timezone.utc)
            + timedelta(days=get_settings().refresh_token_days),
        )
        self.repository.session.add(session)
        await self.repository.session.flush()
        await self.repository.session.commit()
        return {"access_token": create_access_token(user_id, session.id), "refresh_token": raw}

    async def refresh(self, raw_token: str, ip: str | None, user_agent: str | None) -> dict:
        session = await self.repository.session_by_hash(hash_token(raw_token))
        if session is None or session.revoked_at is not None or _expired(session.expires_at):
            raise InvalidTokenError("Refresh token inválido, expirado o revocado")
        replacement = generate_token()
        session.refresh_token_hash = hash_token(replacement)
        session.last_used_at = datetime.now(timezone.utc)
        session.ip, session.user_agent = ip, user_agent
        await self.repository.session.commit()
        return {"access_token": create_access_token(session.usuario_id, session.id), "refresh_token": replacement}

    async def logout(self, user_id: int, session_id: int) -> None:
        session = await self.repository.active_session(session_id, user_id)
        if session is None:
            raise InvalidTokenError("Sesión inválida o revocada")
        session.revoked_at = datetime.now(timezone.utc)
        await self.repository.session.commit()

    async def logout_all(self, user_id: int) -> None:
        await self.repository.revoke_all(user_id)
        await self.repository.session.commit()

    async def sessions(self, user_id: int) -> list[SesionUsuario]:
        return await self.repository.active_sessions(user_id)

    async def create_recovery(self, email: str) -> str | None:
        user = await self.repository.user_by_email(email)
        if user is None:
            return None
        raw_token = generate_token()
        self.repository.session.add(
            TokenRecuperacion(
                usuario_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=get_settings().recovery_token_minutes),
            )
        )
        await self.repository.session.commit()
        return raw_token

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        token = await self.repository.recovery_by_hash(hash_token(raw_token))
        if token is None or token.consumed_at is not None or _expired(token.expires_at):
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user = await self.repository.user_by_id(token.usuario_id)
        if user is None:
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user.password_hash = hash_password(new_password)
        token.consumed_at = datetime.now(timezone.utc)
        await self.repository.session.commit()

    async def create_email_verification(self, user: Usuario) -> str:
        raw_token = generate_token()
        self.repository.session.add(
            VerificacionCorreo(
                usuario_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc)
                + timedelta(hours=get_settings().email_verification_hours),
            )
        )
        await self.repository.session.commit()
        return raw_token

    async def verify_email(self, raw_token: str) -> None:
        token = await self.repository.verification_by_hash(hash_token(raw_token))
        if token is None or token.consumed_at is not None or _expired(token.expires_at):
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user = await self.repository.user_by_id(token.usuario_id)
        if user is None:
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user.email_verificado = True
        token.consumed_at = datetime.now(timezone.utc)
        await self.repository.session.commit()


class RbacService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    async def _user(self, user_id: int) -> Usuario:
        user = await self.repository.user_by_id(user_id)
        if user is None:
            raise ResourceNotFoundError(f"Usuario con id {user_id} no existe")
        return user

    async def _role(self, role_id: int) -> Rol:
        role = await self.repository.session.get(Rol, role_id)
        if role is None:
            raise ResourceNotFoundError(f"Rol con id {role_id} no existe")
        return role

    async def list_user_roles(self, user_id: int) -> list[Rol]:
        return (await self._user(user_id)).roles

    async def add_user_role(self, user_id: int, role_id: int) -> list[Rol]:
        user, role = await self._user(user_id), await self._role(role_id)
        if role in user.roles:
            raise ResourceConflictError("El usuario ya tiene ese rol")
        user.roles.append(role)
        await self.repository.session.commit()
        return user.roles

    async def remove_user_role(self, user_id: int, role_id: int) -> None:
        user, role = await self._user(user_id), await self._role(role_id)
        if role not in user.roles:
            raise ResourceNotFoundError("El usuario no tiene ese rol")
        user.roles.remove(role)
        await self.repository.session.commit()

    async def list_role_permissions(self, role_id: int) -> list[Permiso]:
        return (await self._role(role_id)).permisos

    async def add_role_permission(self, role_id: int, permission_id: int) -> list[Permiso]:
        role = await self._role(role_id)
        permission = await self.repository.session.get(Permiso, permission_id)
        if permission is None:
            raise ResourceNotFoundError(f"Permiso con id {permission_id} no existe")
        if permission in role.permisos:
            raise ResourceConflictError("El rol ya tiene ese permiso")
        role.permisos.append(permission)
        await self.repository.session.commit()
        return role.permisos

    async def remove_role_permission(self, role_id: int, permission_id: int) -> None:
        role = await self._role(role_id)
        permission = await self.repository.session.get(Permiso, permission_id)
        if permission is None or permission not in role.permisos:
            raise ResourceNotFoundError("El rol no tiene ese permiso")
        role.permisos.remove(permission)
        await self.repository.session.commit()
