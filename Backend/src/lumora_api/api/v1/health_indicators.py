from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_clinical_access
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.schemas.health_indicators import (
    AlertaClinicaResponse,
    AlertaClinicaUpdate,
    IndicadorMedicoCreate,
    IndicadorMedicoResponse,
    MedicionIndicadorCreate,
    MedicionIndicadorResponse,
    RangoIndicadorCreate,
    RangoIndicadorResponse,
)
from lumora_api.services.health_indicators_service import HealthIndicatorsService
from lumora_api.services.patient_access_service import PatientAccessService

router = APIRouter(prefix="/health-indicators", tags=["Indicadores y alertas"])

# Solo personal clinico define el catalogo de indicadores/rangos y atiende
# alertas -- el paciente/cuidador los consulta y registra mediciones, pero
# no los inventa (mismo criterio que RequireClinicalStaff en schedules.py).
RequireClinicalStaff = Depends(require_clinical_access)


def _patient_access(session: SessionDep) -> PatientAccessService:
    return PatientAccessService(PatientAccessRepository(session))


# --- INDICADORES MÃ‰DICOS ---
@router.post(
    "/indicators",
    response_model=IndicadorMedicoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireClinicalStaff],
)
async def create_indicador(
    data: IndicadorMedicoCreate, session: SessionDep
):
    return await HealthIndicatorsService.create_indicador(session, data)


@router.get("/indicators", response_model=List[IndicadorMedicoResponse])
async def list_indicadores(
    current_user: CurrentUser,
    session: SessionDep,
    active_only: bool = Query(True),
):
    return await HealthIndicatorsService.get_indicadores(session, active_only)


# --- RANGOS ---
@router.post(
    "/indicators/{indicador_id}/ranges",
    response_model=RangoIndicadorResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireClinicalStaff],
)
async def create_rango(
    indicador_id: UUID,
    data: RangoIndicadorCreate,
    session: SessionDep,
):
    return await HealthIndicatorsService.create_rango(session, indicador_id, data)


@router.get(
    "/indicators/{indicador_id}/ranges",
    response_model=List[RangoIndicadorResponse],
)
async def list_rangos(
    indicador_id: UUID,
    current_user: CurrentUser,
    session: SessionDep,
    active_only: bool = Query(True),
):
    return await HealthIndicatorsService.get_rangos_indicador(session, indicador_id, active_only)


# --- MEDICIONES ---
@router.post(
    "/patients/{paciente_id}/measurements",
    response_model=MedicionIndicadorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def registrar_medicion(
    paciente_id: int,
    data: MedicionIndicadorCreate,
    current_user: CurrentUser,
    session: SessionDep,
):
    await _patient_access(session).require_access(current_user, paciente_id, action="write")
    # El responsable del registro es siempre quien esta logueado, nunca un
    # valor que mande el cliente (mismo criterio que
    # schedules.py::create_dosis_log con responsable_id).
    data.registrado_por_id = current_user.id
    return await HealthIndicatorsService.registrar_medicion(session, paciente_id, data, current_user)


@router.get(
    "/patients/{paciente_id}/measurements",
    response_model=List[MedicionIndicadorResponse],
)
async def list_mediciones_paciente(
    paciente_id: int,
    current_user: CurrentUser,
    session: SessionDep,
):
    await _patient_access(session).require_access(current_user, paciente_id, action="read")
    return await HealthIndicatorsService.get_mediciones_paciente(session, paciente_id)


# --- ALERTAS ---
@router.get(
    "/alerts",
    response_model=List[AlertaClinicaResponse],
    dependencies=[RequireClinicalStaff],
)
async def list_todas_alertas(
    session: SessionDep,
    solo_pendientes: bool = Query(True),
):
    return await HealthIndicatorsService.get_todas_alertas(session, solo_pendientes)


@router.get(
    "/patients/{paciente_id}/alerts", response_model=List[AlertaClinicaResponse]
)
async def list_alertas_paciente(
    paciente_id: int,
    current_user: CurrentUser,
    session: SessionDep,
    solo_pendientes: bool = Query(True),
):
    await _patient_access(session).require_access(current_user, paciente_id, action="read")
    return await HealthIndicatorsService.get_alertas_paciente(
        session, paciente_id, solo_pendientes
    )


@router.patch(
    "/alerts/{alerta_id}/attend",
    response_model=AlertaClinicaResponse,
    dependencies=[RequireClinicalStaff],
)
async def atender_alerta(
    alerta_id: UUID,
    data: AlertaClinicaUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    # Mismo criterio que registrado_por_id: quien atiende la alerta es
    # siempre el usuario autenticado, no un valor que mande el cliente.
    data.atendida_por_id = current_user.id
    return await HealthIndicatorsService.atender_alerta(session, alerta_id, data, current_user)
