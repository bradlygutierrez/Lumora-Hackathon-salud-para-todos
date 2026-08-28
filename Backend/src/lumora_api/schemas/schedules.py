from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# HORARIOS DE MEDICAMENTOS
# ==========================================


class HorarioMedicamentoBase(BaseModel):
    hora: time
    activo: bool = True


class HorarioMedicamentoCreate(HorarioMedicamentoBase):
    detalle_receta_id: str


class HorarioMedicamentoUpdate(BaseModel):
    hora: Optional[time] = None
    activo: Optional[bool] = None


class HorarioMedicamentoResponse(HorarioMedicamentoBase):
    id: UUID
    detalle_receta_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# DOSIS ADMINISTRADAS
# ==========================================


class DosisAdministradaBase(BaseModel):
    estado_dosis_id: int
    fecha_programada: datetime
    observaciones: Optional[str] = None


class DosisAdministradaCreate(DosisAdministradaBase):
    # horario_id y responsable_id son opcionales aca porque el endpoint
    # (schedules.py::create_dosis_log) siempre los sobrescribe con el
    # path param y el usuario autenticado respectivamente -- si se dejan
    # obligatorios, FastAPI rechaza con 422 cualquier request que
    # (correctamente) no los mande en el body.
    horario_id: Optional[UUID] = None
    responsable_id: Optional[int] = None
    origen_registro_id: int


class DosisAdministradaResponse(DosisAdministradaBase):
    id: UUID
    horario_id: UUID
    fecha_registro: datetime
    responsable_id: int
    origen_registro_id: int

    model_config = ConfigDict(from_attributes=True)