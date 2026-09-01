from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_clinical_access
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.diagnosis_repository import DiagnosisRepository
from lumora_api.schemas import (
    ConditionCreate,
    ConditionHistoryRead,
    ConditionRead,
    ConditionUpdate,
    Page,
)
from lumora_api.services.diagnosis_service import DiagnosisService

router = APIRouter(
    tags=["Profesionales de salud"],
    dependencies=[Depends(require_clinical_access)],
)


def service(session: SessionDep) -> DiagnosisService:
    return DiagnosisService(DiagnosisRepository(session))


@router.get("/expedientes/{record_id}/condiciones", response_model=Page[ConditionRead])
async def list_conditions(
    record_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await service(session).list_conditions(
        record_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/expedientes/{record_id}/condiciones",
    response_model=ConditionRead,
    status_code=201,
    responses=ERRORS,
)
async def create_condition(
    record_id: int,
    data: ConditionCreate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).create_condition(record_id, data, current_user.id)


@router.patch("/condiciones/{condition_id}", response_model=ConditionRead, responses=ERRORS)
async def update_condition(
    condition_id: int,
    data: ConditionUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).update_condition(condition_id, data, current_user.id)


@router.delete(
    "/condiciones/{condition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_condition(
    condition_id: int, current_user: CurrentUser, session: SessionDep
) -> Response:
    await service(session).delete_condition(condition_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/condiciones/{condition_id}/historial", response_model=Page[ConditionHistoryRead])
async def list_condition_history(
    condition_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list_condition_history(
        condition_id, limit, offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)