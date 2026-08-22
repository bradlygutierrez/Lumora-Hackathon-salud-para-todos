from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

ShortText = Annotated[str, Field(min_length=1, max_length=180)]
Description = Annotated[str, Field(min_length=1, max_length=300)]


class ClinicalStatusMixin(BaseModel):
    activo: bool = True


class MedicalRecordCreate(ClinicalStatusMixin):
    paciente_id: int
    estado_expediente_id: int
    numero_expediente: Annotated[str, Field(min_length=1, max_length=50)]
    notas: str | None = Field(default=None, max_length=2000)


class MedicalRecordUpdate(BaseModel):
    estado_expediente_id: int | None = None
    numero_expediente: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    notas: str | None = Field(default=None, max_length=2000)
    activo: bool | None = None


class MedicalRecordRead(BaseModel):
    id: int
    paciente_id: int
    estado_expediente_id: int
    numero_expediente: str
    notas: str | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class MedicalHistoryCreate(ClinicalStatusMixin):
    tipo_antecedente_id: int
    descripcion: Description
    fecha: date | None = None


class MedicalHistoryUpdate(BaseModel):
    tipo_antecedente_id: int | None = None
    descripcion: Description | None = None
    fecha: date | None = None
    activo: bool | None = None


class MedicalHistoryRead(BaseModel):
    id: int
    expediente_id: int
    tipo_antecedente_id: int
    descripcion: str
    fecha: date | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class AllergyCreate(ClinicalStatusMixin):
    nombre: ShortText
    nivel_severidad_id: int | None = None
    estado_condicion_id: int | None = None
    observaciones: str | None = Field(default=None, max_length=2000)


class AllergyUpdate(BaseModel):
    nombre: ShortText | None = None
    nivel_severidad_id: int | None = None
    estado_condicion_id: int | None = None
    observaciones: str | None = Field(default=None, max_length=2000)
    activo: bool | None = None


class AllergyRead(BaseModel):
    id: int
    paciente_id: int
    nombre: str
    nivel_severidad_id: int | None
    estado_condicion_id: int | None
    observaciones: str | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class DisabilityCreate(ClinicalStatusMixin):
    nombre: ShortText
    estado_condicion_id: int | None = None
    observaciones: str | None = Field(default=None, max_length=2000)


class DisabilityUpdate(BaseModel):
    nombre: ShortText | None = None
    estado_condicion_id: int | None = None
    observaciones: str | None = Field(default=None, max_length=2000)
    activo: bool | None = None


class DisabilityRead(BaseModel):
    id: int
    paciente_id: int
    nombre: str
    estado_condicion_id: int | None
    observaciones: str | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)
