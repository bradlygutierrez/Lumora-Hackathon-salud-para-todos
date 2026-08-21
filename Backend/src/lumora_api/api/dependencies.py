from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session
from lumora_api.core.exceptions import AuthenticationError, PermissionDeniedError
from lumora_api.core.security import decode_access_token
from lumora_api.models import Usuario
from lumora_api.repositories.auth_repository import AuthRepository

SessionDep = Annotated[AsyncSession, Depends(get_session)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    session: SessionDep, token: Annotated[str, Depends(oauth2_scheme)]
) -> Usuario:
    user = await AuthRepository(session).user_by_id(decode_access_token(token))
    if user is None:
        raise AuthenticationError("Usuario no autenticado")
    return user


CurrentUser = Annotated[Usuario, Depends(get_current_user)]


def require_permission(permission_name: str):
    async def dependency(current_user: CurrentUser) -> Usuario:
        permissions = {
            permission.nombre
            for role in current_user.roles
            for permission in role.permisos
        }
        if permission_name not in permissions:
            raise PermissionDeniedError("No tiene permiso para realizar esta acción")
        return current_user

    return dependency
