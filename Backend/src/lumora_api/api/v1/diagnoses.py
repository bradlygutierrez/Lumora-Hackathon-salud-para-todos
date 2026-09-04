from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import (
    CurrentUser,
    SessionDep,
    require_permission,
    require_clinical_access,
)
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.diagnosis_repository import DiagnosisRepository
from lumora_api.schemas import DiagnosisCreate, DiagnosisRead, DiagnosisUpdate, Page
from lumora_api.services.diagnosis_service import DiagnosisService

router = APIRouter(
    tags=["Diagnósticos"],
    dependencies=[Depends(require_clinical_access)],
)


def service(session: SessionDep) -> DiagnosisService:
    return DiagnosisService(DiagnosisRepository(session))


@router.get("/consultas/{consultation_id}/diagnosticos", response_model=Page[DiagnosisRead])
async def list_diagnoses(
    consultation_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list_for_consultation(
        consultation_id, limit, offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/consultas/{consultation_id}/diagnosticos",
    response_model=DiagnosisRead,
    status_code=201,
    responses=ERRORS,
)
async def create_diagnosis(
    consultation_id: int, data: DiagnosisCreate, current_user: CurrentUser, session: SessionDep
):
    return await service(session).create_diagnosis(consultation_id, data, current_user)


@router.get("/diagnosticos/{diagnosis_id}", response_model=DiagnosisRead, responses={404: ERRORS[404]})
async def get_diagnosis(diagnosis_id: int, session: SessionDep):
    return await service(session).get_diagnosis(diagnosis_id)


@router.patch("/diagnosticos/{diagnosis_id}", response_model=DiagnosisRead, responses=ERRORS)
async def update_diagnosis(diagnosis_id: int, data: DiagnosisUpdate, session: SessionDep):
    return await service(session).update_diagnosis(diagnosis_id, data)


@router.delete(
    "/diagnosticos/{diagnosis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_diagnosis(diagnosis_id: int, session: SessionDep) -> Response:
    await service(session).delete_diagnosis(diagnosis_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)