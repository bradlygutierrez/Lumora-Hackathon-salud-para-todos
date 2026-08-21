from fastapi import APIRouter, Query, Response, status

from lumora_api.api.dependencies import SessionDep
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.user_repository import UserRepository
from lumora_api.schemas import Page, UserCreate, UserRead, UserUpdate
from lumora_api.services.identity_service import UserService

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=Page[UserRead], summary="Listar usuarios")
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


@router.get("/{user_id}", response_model=UserRead, responses={404: ERRORS[404]})
async def get_user(user_id: int, session: SessionDep):
    return await UserService(UserRepository(session)).get(user_id)


@router.patch("/{user_id}", response_model=UserRead, responses=ERRORS)
async def update_user(user_id: int, data: UserUpdate, session: SessionDep):
    return await UserService(UserRepository(session)).update(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
async def delete_user(user_id: int, session: SessionDep) -> Response:
    await UserService(UserRepository(session)).delete(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
