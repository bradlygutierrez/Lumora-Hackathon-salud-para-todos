from typing import List
from uuid import UUID

from fastapi import APIRouter, Query, status

from lumora_api.api.dependencies import SessionDep
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

router = APIRouter(prefix="/health-indicators", tags=["Indicadores y alertas"])


# --- INDICADORES MÉDICOS ---
@router.post(
    "/indicators",
    response_model=IndicadorMedicoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_indicador(
    data: IndicadorMedicoCreate, session: SessionDep
):
    return await HealthIndicatorsService.create_indicador(session, data)


@router.get("/indicators", response_model=List[IndicadorMedicoResponse])
async def list_indicadores(
    session: SessionDep, active_only: bool = Query(True)
):
    return await HealthIndicatorsService.get_indicadores(session, active_only)


# --- RANGOS ---
@router.post(
    "/indicators/{indicador_id}/ranges",
    response_model=RangoIndicadorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_rango(
    indicador_id: UUID,
    data: RangoIndicadorCreate,
    session: SessionDep,
):
    return await HealthIndicatorsService.create_rango(session, indicador_id, data)


# --- MEDICIONES ---
@router.post(
    "/patients/{paciente_id}/measurements",
    response_model=MedicionIndicadorResponse,
    status_code=status.HTTP_201_CREATED,
)
async def registrar_medicion(
    paciente_id: int,
    data: MedicionIndicadorCreate,
    session: SessionDep,
):
    return await HealthIndicatorsService.registrar_medicion(session, paciente_id, data)


@router.get(
    "/patients/{paciente_id}/measurements",
    response_model=List[MedicionIndicadorResponse],
)
async def list_mediciones_paciente(
    paciente_id: int,
    session: SessionDep,
):
    return await HealthIndicatorsService.get_mediciones_paciente(session, paciente_id)


# --- ALERTAS ---
@router.get("/alerts", response_model=List[AlertaClinicaResponse])
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
    session: SessionDep,
    solo_pendientes: bool = Query(True),
):
    return await HealthIndicatorsService.get_alertas_paciente(
        session, paciente_id, solo_pendientes
    )


@router.patch("/alerts/{alerta_id}/attend", response_model=AlertaClinicaResponse)
async def atender_alerta(
    alerta_id: UUID, data: AlertaClinicaUpdate, session: SessionDep
):
    return await HealthIndicatorsService.atender_alerta(session, alerta_id, data)