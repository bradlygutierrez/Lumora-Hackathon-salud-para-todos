from datetime import date, datetime

from fastapi import APIRouter, Query, Request, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.services.authorization import (
    ensure_can_access_patient_data,
    is_clinical_staff,
    own_patient_id,
)
from lumora_api.repositories.appointment_repository import AppointmentRepository
from lumora_api.schemas.appointments import (
    AppointmentCreate,
    AppointmentCancellation, AvailabilityRead, AppointmentLocationRead,
    AppointmentRead,
    AppointmentReschedule,
    AppointmentUpdate,
    ProfessionalSummary,
)
from lumora_api.services.appointment_service import AppointmentService

router = APIRouter(prefix="/citas", tags=["Citas"])


def context(request: Request) -> tuple[str | None, str | None]:
    return request.client.host if request.client else None, request.headers.get("user-agent")


@router.get("", response_model=list[AppointmentRead], response_model_exclude_none=True)
async def list_appointments(session: SessionDep, current_user: CurrentUser,
                            paciente_id: int | None = None, profesional_id: int | None = None,
                            desde: datetime | None = Query(None), hasta: datetime | None = Query(None)):
    if not is_clinical_staff(current_user):
        roles = {role.nombre.lower() for role in current_user.roles}
        if "paciente" in roles:
            own_id = await own_patient_id(session, current_user)
            if own_id is None:
                raise PermissionDeniedError("El usuario no tiene perfil de paciente")
            paciente_id = own_id if paciente_id is None else paciente_id
        elif "cuidador" in roles:
            if paciente_id is None:
                raise PermissionDeniedError("Debe seleccionar un paciente autorizado")
        else:
            raise PermissionDeniedError("No tiene permiso para consultar citas")
        await ensure_can_access_patient_data(session, current_user, paciente_id)
    return await AppointmentService(AppointmentRepository(session)).list(paciente_id, profesional_id, desde, hasta)


@router.get("/profesionales-disponibles", response_model=list[ProfessionalSummary], response_model_exclude_none=True)
async def available_professionals(session: SessionDep, current_user: CurrentUser, q: str | None = Query(None, max_length=100), especialidad: str | None = Query(None, max_length=100)):
    return await AppointmentService(AppointmentRepository(session)).available_professionals(q, especialidad)


@router.get("/disponibilidad", response_model=AvailabilityRead)
async def availability(profesional_id: int, fecha: date, session: SessionDep, current_user: CurrentUser):
    return await AppointmentService(AppointmentRepository(session)).availability(profesional_id, fecha)


@router.get("/ubicaciones-disponibles", response_model=list[AppointmentLocationRead])
async def available_locations(session: SessionDep, current_user: CurrentUser):
    return await AppointmentService(AppointmentRepository(session)).repository.locations()


@router.post("", response_model=AppointmentRead, response_model_exclude_none=True, status_code=201)
async def create_appointment(data: AppointmentCreate, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    await ensure_can_access_patient_data(
        session, current_user, data.paciente_id, action="write"
    )
    if not is_clinical_staff(current_user) and data.estado_cita_id is not None:
        raise PermissionDeniedError("El estado inicial de la cita es controlado por el servidor")
    return await AppointmentService(AppointmentRepository(session)).create(data, current_user.id, *context(request))


@router.get("/{appointment_id}", response_model=AppointmentRead, response_model_exclude_none=True)
async def get_appointment(appointment_id: int, session: SessionDep, current_user: CurrentUser):
    item = await AppointmentService(AppointmentRepository(session)).get(appointment_id)
    await ensure_can_access_patient_data(session, current_user, item.paciente_id)
    return item


@router.patch("/{appointment_id}/reprogramar", response_model=AppointmentRead, response_model_exclude_none=True)
async def reschedule_appointment(
    appointment_id: int,
    data: AppointmentReschedule,
    request: Request,
    session: SessionDep,
    current_user: CurrentUser,
):
    service = AppointmentService(AppointmentRepository(session))
    item = await service.get(appointment_id)
    await ensure_can_access_patient_data(
        session, current_user, item.paciente_id, action="write"
    )
    return await service.reschedule(
        appointment_id, data, current_user.id, *context(request)
    )


@router.post("/{appointment_id}/cancelar", response_model=AppointmentRead, response_model_exclude_none=True)
async def cancel_appointment(
    appointment_id: int,
    request: Request,
    session: SessionDep,
    current_user: CurrentUser,
    data: AppointmentCancellation | None = None,
):
    service = AppointmentService(AppointmentRepository(session))
    item = await service.get(appointment_id)
    await ensure_can_access_patient_data(
        session, current_user, item.paciente_id, action="write"
    )
    return await service.cancel(
        appointment_id, current_user.id, *context(request), data.motivo if data else None
    )


@router.patch("/{appointment_id}", response_model=AppointmentRead, response_model_exclude_none=True)
async def update_appointment(appointment_id: int, data: AppointmentUpdate, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    service = AppointmentService(AppointmentRepository(session))
    item = await service.get(appointment_id)
    await ensure_can_access_patient_data(session, current_user, item.paciente_id)
    if not is_clinical_staff(current_user):
        raise PermissionDeniedError("Use las operaciones de reprogramación o cancelación")
    return await service.update(appointment_id, data, current_user.id, *context(request))


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: int, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    service = AppointmentService(AppointmentRepository(session))
    item = await service.get(appointment_id)
    await ensure_can_access_patient_data(session, current_user, item.paciente_id)
    if not is_clinical_staff(current_user):
        raise PermissionDeniedError("La cancelación no elimina físicamente la cita")
    await service.delete(appointment_id, current_user.id, *context(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
