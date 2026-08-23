from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# --- MEDICAMENTOS ---
class MedicamentoBase(BaseModel):
    nombre: str
    nombre_generico: Optional[str] = None
    presentacion: Optional[str] = None
    concentracion: Optional[str] = None
    fabricante: Optional[str] = None


class MedicamentoCreate(MedicamentoBase):
    pass


class MedicamentoUpdate(BaseModel):
    nombre: Optional[str] = None
    nombre_generico: Optional[str] = None
    presentacion: Optional[str] = None
    concentracion: Optional[str] = None
    fabricante: Optional[str] = None
    activo: Optional[bool] = None


class MedicamentoResponse(MedicamentoBase):
    id: str
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- DETALLE RECETA ---
class DetalleRecetaBase(BaseModel):
    medicamento_id: str
    unidad_medida_id: int
    via_administracion_id: int
    dosis: str
    frecuencia: str
    duracion_dias: int = Field(..., gt=0, description="La duración debe ser mayor a 0")
    cantidad_total: int = Field(..., gt=0, description="La cantidad total debe ser mayor a 0")
    instrucciones: Optional[str] = None


class DetalleRecetaCreate(DetalleRecetaBase):
    pass


class DetalleRecetaUpdate(BaseModel):
    medicamento_id: Optional[str] = None
    unidad_medida_id: Optional[int] = None
    via_administracion_id: Optional[int] = None
    dosis: Optional[str] = None
    frecuencia: Optional[str] = None
    duracion_dias: Optional[int] = Field(None, gt=0)
    cantidad_total: Optional[int] = Field(None, gt=0)
    instrucciones: Optional[str] = None


class DetalleRecetaResponse(DetalleRecetaBase):
    id: str
    receta_id: str

    model_config = ConfigDict(from_attributes=True)


# --- RECETA ---
class RecetaCreate(BaseModel):
    paciente_id: int
    profesional_id: int
    consulta_id: Optional[int] = None
    estado_id: int = 1
    vigencia_hasta: Optional[datetime] = None
    observaciones: Optional[str] = None
    detalles: List[DetalleRecetaCreate]


class RecetaUpdate(BaseModel):
    estado_id: Optional[int] = None
    vigencia_hasta: Optional[datetime] = None
    observaciones: Optional[str] = None


class RecetaResponse(BaseModel):
    id: str
    paciente_id: int
    profesional_id: int
    consulta_id: Optional[int] = None
    estado_id: int
    fecha_emision: datetime
    vigencia_hasta: Optional[datetime] = None
    observaciones: Optional[str] = None
    created_at: datetime
    detalles: List[DetalleRecetaResponse] = []

    model_config = ConfigDict(from_attributes=True)