from fastapi import APIRouter, Depends, Response, status

from lumora_api.api.dependencies import SessionDep, require_permission
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas import PermissionAssignment, PermissionRead
from lumora_api.services.auth_service import RbacService

router = APIRouter(
    prefix="/roles/{role_id}/permisos",
    tags=["Permisos de rol"],
    dependencies=[Depends(require_permission("rbac:manage"))],
)


@router.get("", response_model=list[PermissionRead])
async def list_role_permissions(role_id: int, session: SessionDep):
    return await RbacService(AuthRepository(session)).list_role_permissions(role_id)


@router.post("", response_model=list[PermissionRead])
async def add_role_permission(
    role_id: int, data: PermissionAssignment, session: SessionDep
):
    return await RbacService(AuthRepository(session)).add_role_permission(
        role_id, data.permiso_id
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_permission(
    role_id: int, data: PermissionAssignment, session: SessionDep
) -> Response:
    await RbacService(AuthRepository(session)).remove_role_permission(
        role_id, data.permiso_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
