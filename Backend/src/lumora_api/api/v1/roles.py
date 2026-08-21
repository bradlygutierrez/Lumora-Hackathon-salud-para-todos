from fastapi import APIRouter, Query, status

from lumora_api.api.dependencies import SessionDep
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.role_repository import RoleRepository
from lumora_api.schemas import Page, RoleCreate, RoleRead, RoleUpdate
from lumora_api.services.role_service import RoleService

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("", response_model=Page[RoleRead], summary="Listar roles")
async def list_roles(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Page[RoleRead]:
    items, total = await RoleService(RoleRepository(session)).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "",
    response_model=RoleRead,
    status_code=status.HTTP_201_CREATED,
    responses={404: ERRORS[404], 409: ERRORS[409]},
    summary="Crear rol",
)
async def create_role(data: RoleCreate, session: SessionDep) -> RoleRead:
    return await RoleService(RoleRepository(session)).create(data)


@router.get(
    "/{role_id}",
    response_model=RoleRead,
    responses={404: ERRORS[404]},
    summary="Obtener rol",
)
async def get_role(role_id: int, session: SessionDep) -> RoleRead:
    return await RoleService(RoleRepository(session)).get(role_id)


@router.patch(
    "/{role_id}",
    response_model=RoleRead,
    responses=ERRORS,
    summary="Actualizar rol",
)
async def update_role(
    role_id: int, data: RoleUpdate, session: SessionDep
) -> RoleRead:
    return await RoleService(RoleRepository(session)).update(role_id, data)
