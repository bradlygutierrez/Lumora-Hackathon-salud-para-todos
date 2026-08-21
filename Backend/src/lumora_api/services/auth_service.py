from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import (
    AuthenticationError,
    InvalidTokenError,
    ResourceConflictError,
    ResourceNotFoundError,
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
        user = await self.repository.user_by_login(login)
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError("Credenciales incorrectas")
        return create_access_token(user.id)

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
