from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.db.session import get_session
from lumora_api.schemas.schedules import (
    DosisAdministradaCreate,
    DosisAdministradaResponse,
    HorarioMedicamentoCreate,
    HorarioMedicamentoResponse,
    HorarioMedicamentoUpdate,
)
from lumora_api.services.schedules import ScheduleService

router = APIRouter(tags=["Schedules & Dose Logs"])


# --- HORARIOS ---

@router.post(
    "/recetas/{detalle_receta_id}/horarios",
    response_model=HorarioMedicamentoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_horario(
    detalle_receta_id: str,
    horario_in: HorarioMedicamentoCreate,
    db: AsyncSession = Depends(get_session),
):
    horario_in.detalle_receta_id = detalle_receta_id
    return await ScheduleService.create_horario(db, horario_in)


@router.get(
    "/recetas/{detalle_receta_id}/horarios",
    response_model=list[HorarioMedicamentoResponse],
)
async def get_horarios(
    detalle_receta_id: str, db: AsyncSession = Depends(get_session)
):
    return await ScheduleService.get_horarios_by_detalle(db, detalle_receta_id)


@router.patch("/horarios/{horario_id}", response_model=HorarioMedicamentoResponse)
async def update_horario(
    horario_id: UUID,
    horario_in: HorarioMedicamentoUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await ScheduleService.update_horario(db, horario_id, horario_in)


@router.delete("/horarios/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_horario(
    horario_id: UUID, db: AsyncSession = Depends(get_session)
):
    await ScheduleService.delete_horario(db, horario_id)


# --- DOSIS ---

@router.post(
    "/horarios/{horario_id}/dosis",
    response_model=DosisAdministradaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dosis_log(
    horario_id: UUID,
    dosis_in: DosisAdministradaCreate,
    db: AsyncSession = Depends(get_session),
):
    dosis_in.horario_id = horario_id
    return await ScheduleService.create_dosis_log(db, dosis_in)


@router.get(
    "/horarios/{horario_id}/dosis",
    response_model=list[DosisAdministradaResponse],
)
async def get_dosis_logs(
    horario_id: UUID, db: AsyncSession = Depends(get_session)
):
    return await ScheduleService.get_dosis_logs_by_horario(db, horario_id)


@router.patch(
    "/dosis/{dosis_id}",
    response_model=DosisAdministradaResponse,
)
async def update_dosis_log(
    dosis_id: UUID,
    estado_dosis_id: int,
    observaciones: str | None = None,
    db: AsyncSession = Depends(get_session),
):
    return await ScheduleService.update_dosis_log(db, dosis_id, estado_dosis_id, observaciones)