from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_clinical_access
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.consultation_repository import ConsultationRepository
from lumora_api.schemas import (
    ClinicalNoteCreate,
    ClinicalNoteRead,
    ClinicalNoteUpdate,
    ConsultationCreate,
    ConsultationRead,
    ConsultationUpdate,
    Page,
    VitalSignsCreate,
    VitalSignsRead,
)
from lumora_api.services.consultation_service import ConsultationService

router = APIRouter(
    prefix="/consultas",
    tags=["Consultas médicas"],
    dependencies=[Depends(require_clinical_access)],
)


def service(session: SessionDep) -> ConsultationService:
    return ConsultationService(ConsultationRepository(session))


@router.get("", response_model=Page[ConsultationRead])
async def list_consultations(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    expediente_id: int | None = None,
    paciente_id: int | None = None,
    profesional_id: int | None = None,
    activo: bool | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
):
    items, total = await service(session).list(
        limit,
        offset,
        expediente_id=expediente_id,
        paciente_id=paciente_id,
        profesional_id=profesional_id,
        activo=activo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=ConsultationRead, status_code=201, responses=ERRORS)
async def create_consultation(
    data: ConsultationCreate, current_user: CurrentUser, session: SessionDep
):
    return await service(session).create(data, current_user)


@router.get("/{consultation_id}", response_model=ConsultationRead, responses={404: ERRORS[404]})
async def get_consultation(consultation_id: int, session: SessionDep):
    return await service(session).get(consultation_id)


@router.patch("/{consultation_id}", response_model=ConsultationRead, responses=ERRORS)
async def update_consultation(
    consultation_id: int, data: ConsultationUpdate, session: SessionDep
):
    return await service(session).update(consultation_id, data)


@router.delete(
    "/{consultation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_consultation(consultation_id: int, session: SessionDep) -> Response:
    await service(session).delete(consultation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{consultation_id}/signos-vitales", response_model=Page[VitalSignsRead])
async def list_vital_signs(
    consultation_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list_vital_signs(
        consultation_id, limit, offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/{consultation_id}/signos-vitales",
    response_model=VitalSignsRead,
    status_code=201,
    responses=ERRORS,
)
async def create_vital_signs(
    consultation_id: int, data: VitalSignsCreate, session: SessionDep
):
    return await service(session).create_vital_signs(consultation_id, data)


@router.get("/{consultation_id}/notas", response_model=Page[ClinicalNoteRead])
async def list_notes(
    consultation_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await service(session).list_notes(
        consultation_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/{consultation_id}/notas",
    response_model=ClinicalNoteRead,
    status_code=201,
    responses=ERRORS,
)
async def create_note(
    consultation_id: int,
    data: ClinicalNoteCreate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).create_note(consultation_id, current_user, data)


@router.get(
    "/{consultation_id}/notas/{note_id}",
    response_model=ClinicalNoteRead,
    responses={404: ERRORS[404]},
)
async def get_note(consultation_id: int, note_id: int, session: SessionDep):
    return await service(session).get_note(consultation_id, note_id)


@router.patch(
    "/{consultation_id}/notas/{note_id}",
    response_model=ClinicalNoteRead,
    responses=ERRORS,
)
async def update_note(
    consultation_id: int,
    note_id: int,
    data: ClinicalNoteUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await service(session).update_note(consultation_id, note_id, current_user, data)