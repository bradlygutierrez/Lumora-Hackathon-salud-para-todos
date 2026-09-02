from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import SessionDep, require_permission, require_active_clinician
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.models import ProfesionalSalud
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.schemas import (
    Page,
    ProfessionalCreate,
    ProfessionalRead,
    ProfessionalUpdate,
)
from lumora_api.services.identity_service import ProfessionalService

router = APIRouter(prefix="/profesionales", tags=["Profesionales de salud"])


def service(session: SessionDep) -> ProfessionalService:
    return ProfessionalService(IdentityRepository(session, ProfesionalSalud))


@router.get(
    "",
    response_model=Page[ProfessionalRead],
    summary="Listar profesionales",
    dependencies=[Depends(require_permission("clinica:manage"))],
)
async def list_professionals(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "",
    response_model=ProfessionalRead,
    status_code=201,
    responses=ERRORS,
    dependencies=[Depends(require_permission("usuarios:editar"))],
)
async def create_professional(data: ProfessionalCreate, session: SessionDep):
    return await service(session).create(data)


@router.get(
    "/{professional_id}",
    response_model=ProfessionalRead,
    responses={404: ERRORS[404]},
    dependencies=[Depends(require_permission("clinica:manage"))],
)
async def get_professional(professional_id: int, session: SessionDep):
    return await service(session).get(professional_id)


@router.patch(
    "/{professional_id}",
    response_model=ProfessionalRead,
    responses=ERRORS,
    dependencies=[Depends(require_permission("usuarios:editar"))],
)
async def update_professional(
    professional_id: int, data: ProfessionalUpdate, session: SessionDep
):
    return await service(session).update(professional_id, data)


@router.delete(
    "/{professional_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
    dependencies=[Depends(require_permission("usuarios:editar"))],
)
async def delete_professional(professional_id: int, session: SessionDep) -> Response:
    await service(session).delete(professional_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)