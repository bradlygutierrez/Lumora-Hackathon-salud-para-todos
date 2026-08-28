from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.repositories.patient_repository import PatientRepository
from lumora_api.schemas import Page, PatientCreate, PatientRead, PatientUpdate
from lumora_api.schemas.identity import (
    PatientDetailRead,
    PatientFamilyRead,
    StaffPatientRegistrationCreate,
)
from lumora_api.schemas.patient_context import PatientContextRead
from lumora_api.services.identity_service import PatientService
from lumora_api.services.patient_access_service import PatientAccessService
from lumora_api.services.staff_patient_service import StaffPatientService

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])
context_router = APIRouter(prefix="/patients", tags=["Pacientes"])


@context_router.get("/me", response_model=PatientContextRead)
async def patient_context(current_user: CurrentUser, session: SessionDep) -> PatientContextRead:
    access = PatientAccessService(PatientAccessRepository(session))
    return PatientContextRead.model_validate(await access.own_patient(current_user.id))


def service(session: SessionDep) -> PatientService:
    return PatientService(PatientRepository(session))


def staff_service(session: SessionDep) -> StaffPatientService:
    return StaffPatientService(PatientRepository(session))


@router.get("", response_model=Page[PatientRead], summary="Listar pacientes")
async def list_patients(
    current_user: CurrentUser,
    session: SessionDep,
    search: str | None = Query(default=None, max_length=120),
    sexo_id: int | None = Query(default=None, ge=1),
    tipo_sangre_id: int | None = Query(default=None, ge=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if not PatientAccessService.can_enumerate(current_user):
        raise PermissionDeniedError("No tiene permiso para enumerar pacientes")
    items, total = await staff_service(session).list_filtered(
        search=search,
        sexo_id=sexo_id,
        tipo_sangre_id=tipo_sangre_id,
        limit=limit,
        offset=offset,
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/registro-clinico",
    response_model=PatientDetailRead,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
    dependencies=[Depends(require_permission("clinica:manage"))],
    summary="Registrar paciente desde Health Staff sin crear cuenta de usuario",
)
async def register_clinical_patient(data: StaffPatientRegistrationCreate, session: SessionDep):
    return await staff_service(session).register(data)


@router.post(
    "",
    response_model=PatientRead,
    status_code=201,
    responses=ERRORS,
    dependencies=[Depends(require_permission("usuarios:editar"))],
)
async def create_patient(data: PatientCreate, session: SessionDep):
    return await service(session).create(data)


@router.get(
    "/me",
    response_model=PatientRead,
    responses={404: ERRORS[404]},
    summary="Perfil de paciente del usuario autenticado",
)
async def get_my_patient_profile(session: SessionDep, current_user: CurrentUser):
    return await service(session).get_by_persona_id(current_user.persona_id)


@router.get(
    "/{patient_id}/familiares",
    response_model=list[PatientFamilyRead],
    responses={404: ERRORS[404]},
    summary="Familiares y accesos autorizados del paciente",
)
async def list_patient_family(patient_id: int, current_user: CurrentUser, session: SessionDep):
    access = PatientAccessService(PatientAccessRepository(session))
    await access.require_access(current_user, patient_id)
    await service(session).get(patient_id)
    return await staff_service(session).family(patient_id)


@router.get("/{patient_id}", response_model=PatientDetailRead, responses={404: ERRORS[404]})
async def get_patient(patient_id: int, current_user: CurrentUser, session: SessionDep):
    await PatientAccessService(PatientAccessRepository(session)).require_access(
        current_user, patient_id
    )
    return await service(session).get(patient_id)


@router.patch("/{patient_id}", response_model=PatientDetailRead, responses=ERRORS)
async def update_patient(
    patient_id: int,
    data: PatientUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    await PatientAccessService(PatientAccessRepository(session)).require_access(
        current_user, patient_id, action="write"
    )
    return await service(session).update(patient_id, data)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
    dependencies=[Depends(require_permission("usuarios:editar"))],
)
async def delete_patient(patient_id: int, session: SessionDep) -> Response:
    await service(session).delete(patient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
