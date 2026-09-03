from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session
from lumora_api.core.exceptions import AuthenticationError, PermissionDeniedError
from lumora_api.core.security import decode_access_claims
from lumora_api.models import ClienteApi, Usuario
from lumora_api.repositories.api_client_repository import ApiClientRepository
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.services.api_client_service import ApiClientService
from lumora_api.services.medical_authorization import ensure_active_medical_affiliation

SessionDep = Annotated[AsyncSession, Depends(get_session)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    session: SessionDep, token: Annotated[str, Depends(oauth2_scheme)]
) -> Usuario:
    user_id, session_id = decode_access_claims(token)
    repository = AuthRepository(session)
    user = await repository.user_by_id(user_id)
    if user is None:
        raise AuthenticationError("Usuario no autenticado")
    if session_id is not None and await repository.active_session(session_id, user_id) is None:
        raise AuthenticationError("Sesión revocada o expirada")
    return user


CurrentUser = Annotated[Usuario, Depends(get_current_user)]


async def get_current_session_id(token: Annotated[str, Depends(oauth2_scheme)]) -> int:
    _, session_id = decode_access_claims(token)
    if session_id is None:
        raise AuthenticationError("El token no pertenece a una sesión")
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
            raise PermissionDeniedError("No tiene permiso para realizar esta acción")
        return current_user

    return dependency

def require_any_permission(*permission_names: str):
    async def dependency(current_user: CurrentUser) -> Usuario:
        permissions = {permission.nombre for role in current_user.roles for permission in role.permisos}
        if not permissions.intersection(permission_names):
            raise PermissionDeniedError("No tiene permiso para realizar esta acciÃ³n")
        return current_user
    return dependency

async def require_clinical_access(
    request: Request, session: SessionDep, current_user: CurrentUser
) -> Usuario:
    permissions = {
        permission.nombre
        for role in current_user.roles
        for permission in role.permisos
    }
    if "clinica:manage" not in permissions:
        raise PermissionDeniedError("Clinical permission required")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        await ensure_active_medical_affiliation(session, current_user)
    return current_user

async def require_active_clinician(session: SessionDep, current_user: CurrentUser) -> Usuario:
    await ensure_active_medical_affiliation(session, current_user)
    return current_user


async def identify_api_client(
    session: SessionDep, api_key: Annotated[str | None, Depends(api_key_header)]
) -> ClienteApi:
    if not api_key:
        raise AuthenticationError("Falta la cabecera X-API-Key")
    client = await ApiClientService(ApiClientRepository(session)).resolve(api_key)
    if client is None:
        raise AuthenticationError("Clave de API inválida o inactiva")
    return client


IdentifiedApiClient = Annotated[ClienteApi, Depends(identify_api_client)]