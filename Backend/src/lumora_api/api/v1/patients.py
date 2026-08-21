from fastapi import APIRouter, Query, Response, status

from lumora_api.api.dependencies import SessionDep
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.models import Paciente
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.schemas import Page, PatientCreate, PatientRead, PatientUpdate
from lumora_api.services.identity_service import PatientService

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])


def service(session: SessionDep) -> PatientService:
    return PatientService(IdentityRepository(session, Paciente))


@router.get("", response_model=Page[PatientRead], summary="Listar pacientes")
async def list_patients(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=PatientRead, status_code=201, responses=ERRORS)
async def create_patient(data: PatientCreate, session: SessionDep):
    return await service(session).create(data)


@router.get("/{patient_id}", response_model=PatientRead, responses={404: ERRORS[404]})
async def get_patient(patient_id: int, session: SessionDep):
    return await service(session).get(patient_id)


@router.patch("/{patient_id}", response_model=PatientRead, responses=ERRORS)
async def update_patient(patient_id: int, data: PatientUpdate, session: SessionDep):
    return await service(session).update(patient_id, data)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
async def delete_patient(patient_id: int, session: SessionDep) -> Response:
    await service(session).delete(patient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
