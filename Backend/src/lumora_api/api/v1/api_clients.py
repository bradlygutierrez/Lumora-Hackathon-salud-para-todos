from fastapi import APIRouter, Depends, status

from lumora_api.api.dependencies import SessionDep, require_permission
from lumora_api.repositories.api_client_repository import ApiClientRepository
from lumora_api.schemas.api_clients import (
    ApiClientCreate,
    ApiClientKeyIssuedRead,
    ApiClientKeyRead,
    ApiClientRead,
    ApiClientUpdate,
)
from lumora_api.services.api_client_service import ApiClientService

router = APIRouter(
    prefix="/clientes-api",
    tags=["Clientes API"],
    dependencies=[Depends(require_permission("sistema:clientes"))],
)


def service(session: SessionDep) -> ApiClientService:
    return ApiClientService(ApiClientRepository(session))


@router.post("", response_model=ApiClientRead, status_code=status.HTTP_201_CREATED)
async def create_client(data: ApiClientCreate, session: SessionDep):
    return await service(session).create_client(data.client_id, data.nombre)


@router.get("", response_model=list[ApiClientRead])
async def list_clients(session: SessionDep):
    return await service(session).list_clients()


@router.get("/{cliente_id}", response_model=ApiClientRead)
async def get_client(cliente_id: int, session: SessionDep):
    return await service(session).get_client(cliente_id)


@router.patch("/{cliente_id}", response_model=ApiClientRead)
async def update_client(cliente_id: int, data: ApiClientUpdate, session: SessionDep):
    return await service(session).update_client(
        cliente_id, nombre=data.nombre, activo=data.activo
    )


@router.get("/{cliente_id}/claves", response_model=list[ApiClientKeyRead])
async def list_keys(cliente_id: int, session: SessionDep):
    return await service(session).list_keys(cliente_id)


@router.post(
    "/{cliente_id}/claves",
    response_model=ApiClientKeyIssuedRead,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir una nueva clave (el valor completo solo se devuelve en esta respuesta)",
)
async def issue_key(cliente_id: int, session: SessionDep):
    key, raw_key = await service(session).issue_key(cliente_id)
    base = ApiClientKeyRead.model_validate(key, from_attributes=True)
    return ApiClientKeyIssuedRead(**base.model_dump(), api_key=raw_key)


@router.patch("/{cliente_id}/claves/{key_id}/revocar", response_model=ApiClientKeyRead)
async def revoke_key(cliente_id: int, key_id: int, session: SessionDep):
    return await service(session).revoke_key(cliente_id, key_id)
