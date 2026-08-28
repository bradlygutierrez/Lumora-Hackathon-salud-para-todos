from fastapi import APIRouter, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.models import Paciente
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.schemas import Page, PatientCreate, PatientRead, PatientUpdate
from lumora_api.schemas.patient_context import PatientContextRead
from lumora_api.services.patient_access_service import PatientAccessService
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.services.identity_service import PatientService

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])
context_router = APIRouter(prefix="/patients", tags=["Pacientes"])

@context_router.get("/me", response_model=PatientContextRead)
async def patient_context(current_user: CurrentUser, session: SessionDep) -> PatientContextRead:
    service = PatientAccessService(PatientAccessRepository(session))
    return PatientContextRead.model_validate(await service.own_patient(current_user.id))


def service(session: SessionDep) -> PatientService:
    return PatientService(IdentityRepository(session, Paciente))


@router.get("", response_model=Page[PatientRead], summary="Listar pacientes")
async def list_patients(
    current_user: CurrentUser,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if not PatientAccessService.can_enumerate(current_user):
        raise PermissionDeniedError("No tiene permiso para enumerar pacientes")
    items, total = await service(session).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=PatientRead, status_code=201, responses=ERRORS)
async def create_patient(data: PatientCreate, session: SessionDep):
    return await service(session).create(data)


@router.get(
    "/me",
    response_model=PatientRead,
    responses={404: ERRORS[404]},
    summary="Perfil de paciente del usuario autenticado",
)
async def get_my_patient_profile(session: SessionDep, current_user: CurrentUser):
    """Resuelve el paciente_id del usuario logueado.

    El JWT solo conoce el usuario_id; este endpoint hace el salto
    Usuario -> Persona -> Paciente para que el frontend pueda llamar
    endpoints como GET /prescriptions/patient/{paciente_id} sin tener
    que adivinar o guardar ese id manualmente.

    Debe declararse ANTES de /{patient_id}: si se pusiera después,
    FastAPI intentaría convertir "me" a int para esa ruta y fallaría
    con 422 en vez de resolver este endpoint.
    """
    return await service(session).get_by_persona_id(current_user.persona_id)


@router.get("/{patient_id}", response_model=PatientRead, responses={404: ERRORS[404]})
async def get_patient(patient_id: int, current_user: CurrentUser, session: SessionDep):
    await PatientAccessService(PatientAccessRepository(session)).require_access(current_user, patient_id)
    return await service(session).get(patient_id)


@router.patch("/{patient_id}", response_model=PatientRead, responses=ERRORS)
async def update_patient(patient_id: int, data: PatientUpdate, session: SessionDep):
    return await service(session).update(patient_id, data)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
async def delete_patient(patient_id: int, session: SessionDep) -> Response:
    await service(session).delete(patient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
