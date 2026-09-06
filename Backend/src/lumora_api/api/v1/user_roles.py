from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from lumora_api.api.dependencies import SessionDep, require_permission
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas import RoleAssignment, RoleRead
from lumora_api.services.auth_service import RbacService

router = APIRouter(
    prefix="/usuarios/{user_id}/roles",
    tags=["Roles de usuario"],
    dependencies=[Depends(require_permission("rbac:manage"))],
)


@router.get("", response_model=list[RoleRead])
async def list_user_roles(user_id: int, session: SessionDep):
    return await RbacService(AuthRepository(session)).list_user_roles(user_id)


@router.post("", response_model=list[RoleRead])
async def add_user_role(user_id: int, data: RoleAssignment, session: SessionDep):
    return await RbacService(AuthRepository(session)).add_user_role(user_id, data.rol_id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_role(
    user_id: int, data: RoleAssignment, session: SessionDep
) -> Response:
    await RbacService(AuthRepository(session)).remove_user_role(user_id, data.rol_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
