from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import SessionDep, require_permission, require_active_clinician
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.models import AntecedenteMedico, Expediente
from lumora_api.repositories.consultation_repository import ConsultationRepository
from lumora_api.repositories.clinical_repository import ClinicalRepository
from lumora_api.schemas import (
    ConsultationRead,
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
    MedicalRecordCreate,
    MedicalRecordRead,
    MedicalRecordUpdate,
    Page,
)
from lumora_api.services.clinical_service import MedicalHistoryService, MedicalRecordService
from lumora_api.services.consultation_service import ConsultationService

router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
    dependencies=[Depends(require_active_clinician)],
)


def record_service(session: SessionDep) -> MedicalRecordService:
    return MedicalRecordService(ClinicalRepository(session, Expediente))


def history_service(session: SessionDep) -> MedicalHistoryService:
    return MedicalHistoryService(ClinicalRepository(session, AntecedenteMedico))


def consultation_service(session: SessionDep) -> ConsultationService:
    return ConsultationService(ConsultationRepository(session))


@router.get("", response_model=Page[MedicalRecordRead])
async def list_records(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await record_service(session).list(limit, offset, activo)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=MedicalRecordRead, status_code=201, responses=ERRORS)
async def create_record(data: MedicalRecordCreate, session: SessionDep):
    return await record_service(session).create(data)


@router.get("/{record_id}", response_model=MedicalRecordRead, responses={404: ERRORS[404]})
async def get_record(record_id: int, session: SessionDep):
    return await record_service(session).get(record_id)


@router.patch("/{record_id}", response_model=MedicalRecordRead, responses=ERRORS)
async def update_record(record_id: int, data: MedicalRecordUpdate, session: SessionDep):
    return await record_service(session).update(record_id, data)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
async def delete_record(record_id: int, session: SessionDep) -> Response:
    await record_service(session).delete(record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{record_id}/consultas", response_model=Page[ConsultationRead])
async def list_record_consultations(
    record_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await consultation_service(session).list_for_record(
        record_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/{record_id}/antecedentes", response_model=Page[MedicalHistoryRead])
async def list_histories(
    record_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await history_service(session).list_for_record(
        record_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/{record_id}/antecedentes",
    response_model=MedicalHistoryRead,
    status_code=201,
    responses=ERRORS,
)
async def create_history(
    record_id: int, data: MedicalHistoryCreate, session: SessionDep
):
    return await history_service(session).create_for_record(record_id, data)


@router.get(
    "/{record_id}/antecedentes/{history_id}",
    response_model=MedicalHistoryRead,
    responses={404: ERRORS[404]},
)
async def get_history(record_id: int, history_id: int, session: SessionDep):
    return await history_service(session).get_for_record(record_id, history_id)


@router.patch(
    "/{record_id}/antecedentes/{history_id}",
    response_model=MedicalHistoryRead,
    responses=ERRORS,
)
async def update_history(
    record_id: int, history_id: int, data: MedicalHistoryUpdate, session: SessionDep
):
    return await history_service(session).update_for_record(record_id, history_id, data)


@router.delete(
    "/{record_id}/antecedentes/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_history(record_id: int, history_id: int, session: SessionDep) -> Response:
    await history_service(session).delete_for_record(record_id, history_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)