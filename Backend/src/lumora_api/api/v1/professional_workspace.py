from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_active_clinician
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.professional_workspace_repository import ProfessionalWorkspaceRepository
from lumora_api.schemas.professional_workspace import (
    MyPatientRead,
    ProfessionalAgendaItemRead,
    ProfessionalAvailabilityRead,
    ProfessionalScheduleCreate,
    ProfessionalScheduleRead,
    ProfessionalScheduleUpdate,
)
from lumora_api.services.professional_workspace_service import ProfessionalWorkspaceService

router = APIRouter(
    prefix="/profesional/me",
    tags=["Espacio profesional"],
    dependencies=[Depends(require_active_clinician)],
)


def service(session: SessionDep) -> ProfessionalWorkspaceService:
    return ProfessionalWorkspaceService(ProfessionalWorkspaceRepository(session))


@router.get("/agenda", response_model=list[ProfessionalAgendaItemRead])
async def my_agenda(
    current_user: CurrentUser,
    session: SessionDep,
    desde: datetime | None = None,
    hasta: datetime | None = None,
):
    return await service(session).agenda(current_user, desde, hasta)


@router.get("/disponibilidad", response_model=ProfessionalAvailabilityRead)
async def my_availability(
    fecha: date,
    current_user: CurrentUser,
    session: SessionDep,
    slot_minutes: int = Query(45, ge=15, le=180),
):
    return await service(session).availability(
        current_user, fecha, slot_minutes
    )


@router.get("/horarios", response_model=list[ProfessionalScheduleRead])
async def list_my_schedules(current_user: CurrentUser, session: SessionDep):
    return await service(session).list_schedules(current_user)


@router.post(
    "/horarios",
    response_model=ProfessionalScheduleRead,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def create_my_schedule(
    data: ProfessionalScheduleCreate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).create_schedule(current_user, data)


@router.patch(
    "/horarios/{schedule_id}",
    response_model=ProfessionalScheduleRead,
    responses=ERRORS,
)
async def update_my_schedule(
    schedule_id: int,
    data: ProfessionalScheduleUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).update_schedule(
        current_user, schedule_id, data
    )


@router.delete(
    "/horarios/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_my_schedule(
    schedule_id: int,
    current_user: CurrentUser,
    session: SessionDep,
) -> Response:
    await service(session).delete_schedule(current_user, schedule_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/pacientes", response_model=list[MyPatientRead])
async def my_patients(current_user: CurrentUser, session: SessionDep):
    return await service(session).my_patients(current_user)