from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session
from lumora_api.core.exceptions import AuthenticationError, PermissionDeniedError
from lumora_api.core.security import decode_access_claims
from lumora_api.models import Usuario
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.services.medical_authorization import ensure_active_medical_affiliation

SessionDep = Annotated[AsyncSession, Depends(get_session)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    session: SessionDep, token: Annotated[str, Depends(oauth2_scheme)]
) -> Usuario:
    user_id, session_id = decode_access_claims(token)
    repository = AuthRepository(session)
    user = await repository.user_by_id(user_id)
    if user is None:
        raise AuthenticationError("Usuario no autenticado")
    if session_id is not None and await repository.active_session(session_id, user_id) is None:
        raise AuthenticationError("SesiÃ³n revocada o expirada")
    return user


CurrentUser = Annotated[Usuario, Depends(get_current_user)]


async def get_current_session_id(token: Annotated[str, Depends(oauth2_scheme)]) -> int:
    _, session_id = decode_access_claims(token)
    if session_id is None:
        raise AuthenticationError("El token no pertenece a una sesiÃ³n")
    return session_id


CurrentSessionId = Annotated[int, Depends(get_current_session_id)]


def require_permission(permission_name: str):
    async def dependency(current_user: CurrentUser) -> Usuario:
        permissions = {
            permission.nombre
            for role in current_user.roles
            for permission in role.permisos
        }
        if permission_name not in permissions:
            raise PermissionDeniedError("No tiene permiso para realizar esta acciÃ³n")
        return current_user

    return dependency

async def require_active_clinician(session: SessionDep, current_user: CurrentUser) -> Usuario:
    await ensure_active_medical_affiliation(session, current_user)
    return current_user