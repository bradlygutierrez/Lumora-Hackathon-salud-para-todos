from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import SessionDep, require_any_permission, require_permission
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.user_repository import UserRepository
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas import Page, UserCreate, UserRead, UserUpdate
from lumora_api.schemas import MessageResponse
from lumora_api.services.identity_service import UserService
from lumora_api.services.auth_service import AuthService

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get(
    "",
    response_model=Page[UserRead],
    summary="Listar usuarios",
    dependencies=[Depends(require_any_permission("usuarios:editar", "afiliaciones:manage"))],
)
async def list_users(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await UserService(UserRepository(session)).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
    summary="Crear usuario",
)
async def create_user(data: UserCreate, session: SessionDep):
    return await UserService(UserRepository(session)).create(data)


@router.post('/admin', response_model=UserRead, status_code=status.HTTP_201_CREATED, responses=ERRORS, dependencies=[Depends(require_any_permission('rbac:manage', 'afiliaciones:manage'))], summary='Crear cuenta de administrador')
async def create_admin(data: UserCreate, session: SessionDep):
    return await UserService(UserRepository(session)).create_admin(data)


@router.post('/{user_id}/password-reset', response_model=MessageResponse, responses={404: ERRORS[404]}, dependencies=[Depends(require_any_permission('rbac:manage', 'afiliaciones:manage'))], summary='Reenviar correo de cambio de contraseña')
async def resend_password_reset(user_id: int, session: SessionDep):
    await AuthService(AuthRepository(session)).create_recovery_for_user(user_id)
    return MessageResponse(message='Correo de cambio de contraseña reenviado')


@router.get(
    "/{user_id}",
    response_model=UserRead,
    responses={404: ERRORS[404]},
    dependencies=[Depends(require_any_permission("usuarios:editar", "afiliaciones:manage"))],
)
async def get_user(user_id: int, session: SessionDep):
    return await UserService(UserRepository(session)).get(user_id)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    responses=ERRORS,
    dependencies=[Depends(require_any_permission("usuarios:editar", "afiliaciones:manage"))],
)
async def update_user(user_id: int, data: UserUpdate, session: SessionDep):
    return await UserService(UserRepository(session)).update(user_id, data)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
    dependencies=[Depends(require_any_permission("usuarios:editar", "afiliaciones:manage"))],
)
async def delete_user(user_id: int, session: SessionDep) -> Response:
    await UserService(UserRepository(session)).delete(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
