from fastapi import APIRouter, Depends, Query

from lumora_api.api.dependencies import SessionDep, require_permission, require_active_clinician
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.clinical_integration_repository import (
    ClinicalIntegrationRepository,
)
from lumora_api.schemas import (
    ClinicalSearchResult,
    ClinicalTimelineItem,
    Page,
    PatientClinicalSummary,
)
from lumora_api.services.clinical_integration_service import ClinicalIntegrationService

router = APIRouter(
    tags=["Profesionales de salud"],
    dependencies=[Depends(require_active_clinician)],
)


def service(session: SessionDep) -> ClinicalIntegrationService:
    return ClinicalIntegrationService(ClinicalIntegrationRepository(session))


@router.get(
    "/pacientes/{patient_id}/resumen-clinico",
    response_model=PatientClinicalSummary,
    responses={404: ERRORS[404]},
)
async def patient_clinical_summary(patient_id: int, session: SessionDep):
    return await service(session).patient_summary(patient_id)


@router.get(
    "/expedientes/{record_id}/timeline",
    response_model=Page[ClinicalTimelineItem],
    responses={404: ERRORS[404]},
)
async def record_timeline(
    record_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tipo: str | None = Query(default=None, min_length=1, max_length=50),
):
    items, total = await service(session).timeline(record_id, limit, offset, tipo)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.get("/clinica/busqueda", response_model=Page[ClinicalSearchResult])
async def clinical_search(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    tipo: str | None = Query(default=None, min_length=1, max_length=50),
    paciente_id: int | None = None,
    expediente_id: int | None = None,
):
    items, total = await service(session).search(
        limit=limit,
        offset=offset,
        q=q,
        tipo=tipo,
        paciente_id=paciente_id,
        expediente_id=expediente_id,
    )
    return Page(items=items, total=total, limit=limit, offset=offset)