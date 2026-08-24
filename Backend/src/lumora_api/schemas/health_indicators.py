from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- INDICADORES MÉDICOS ---
class IndicadorMedicoBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=100)
    unidad_medida_id: int
    descripcion: Optional[str] = None
    activo: bool = True


class IndicadorMedicoCreate(IndicadorMedicoBase):
    pass


class IndicadorMedicoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50)
    nombre: Optional[str] = Field(None, max_length=100)
    unidad_medida_id: Optional[int] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class IndicadorMedicoResponse(IndicadorMedicoBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- RANGOS DE INDICADORES ---
class RangoIndicadorBase(BaseModel):
    nivel_severidad_id: int
    valor_minimo: Optional[float] = None
    valor_maximo: Optional[float] = None
    etiqueta: str = Field(..., max_length=50)
    activo: bool = True


class RangoIndicadorCreate(RangoIndicadorBase):
    pass


class RangoIndicadorUpdate(BaseModel):
    nivel_severidad_id: Optional[int] = None
    valor_minimo: Optional[float] = None
    valor_maximo: Optional[float] = None
    etiqueta: Optional[str] = Field(None, max_length=50)
    activo: Optional[bool] = None


class RangoIndicadorResponse(RangoIndicadorBase):
    id: UUID
    indicador_id: UUID

    class Config:
        from_attributes = True


# --- MEDICIONES DE INDICADORES ---
class MedicionIndicadorCreate(BaseModel):
    indicador_id: UUID
    valor: float
    unidad_medida_id: int
    origen_registro_id: int
    registrado_por_id: int
    observaciones: Optional[str] = None


class MedicionIndicadorResponse(BaseModel):
    id: UUID
    paciente_id: int
    indicador_id: UUID
    valor: float
    unidad_medida_id: int
    origen_registro_id: int
    registrado_por_id: int
    fecha_medicion: datetime
    observaciones: Optional[str] = None

    class Config:
        from_attributes = True


# --- ALERTAS CLÍNICAS ---
class AlertaClinicaResponse(BaseModel):
    id: UUID
    paciente_id: int
    medicion_id: UUID
    nivel_severidad_id: int
    tipo_alerta_id: int
    origen_registro_id: int
    mensaje: str
    atendida: bool
    atendida_por_id: Optional[int] = None
    fecha_alerta: datetime
    fecha_atencion: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertaClinicaUpdate(BaseModel):
    atendida: bool
    atendida_por_id: int