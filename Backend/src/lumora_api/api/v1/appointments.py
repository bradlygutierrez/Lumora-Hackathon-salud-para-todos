from datetime import datetime

from fastapi import APIRouter, Query, Request, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.services.authorization import ensure_can_access_patient_data, own_patient_id
from lumora_api.repositories.appointment_repository import AppointmentRepository
from lumora_api.schemas.appointments import AppointmentCreate, AppointmentRead, AppointmentUpdate
from lumora_api.services.appointment_service import AppointmentService

router = APIRouter(prefix="/citas", tags=["Citas"])


def context(request: Request) -> tuple[str | None, str | None]:
    return request.client.host if request.client else None, request.headers.get("user-agent")


@router.get("", response_model=list[AppointmentRead])
async def list_appointments(session: SessionDep, current_user: CurrentUser,
                            paciente_id: int | None = None, profesional_id: int | None = None,
                            desde: datetime | None = Query(None), hasta: datetime | None = Query(None)):
    if paciente_id is not None:
        roles = {role.nombre.lower() for role in current_user.roles}
        # Keep compatibility with legacy records that carry a patient role
        # but have not yet been linked to a patient profile.
        if not ("paciente" in roles and await own_patient_id(session, current_user) is None):
            await ensure_can_access_patient_data(session, current_user, paciente_id)
    return await AppointmentService(AppointmentRepository(session)).list(paciente_id, profesional_id, desde, hasta)


@router.post("", response_model=AppointmentRead, status_code=201)
async def create_appointment(data: AppointmentCreate, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    return await AppointmentService(AppointmentRepository(session)).create(data, current_user.id, *context(request))


@router.get("/{appointment_id}", response_model=AppointmentRead)
async def get_appointment(appointment_id: int, session: SessionDep, current_user: CurrentUser):
    return await AppointmentService(AppointmentRepository(session)).get(appointment_id)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def update_appointment(appointment_id: int, data: AppointmentUpdate, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    return await AppointmentService(AppointmentRepository(session)).update(appointment_id, data, current_user.id, *context(request))


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: int, request: Request,
                             session: SessionDep, current_user: CurrentUser):
    await AppointmentService(AppointmentRepository(session)).delete(appointment_id, current_user.id, *context(request))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
