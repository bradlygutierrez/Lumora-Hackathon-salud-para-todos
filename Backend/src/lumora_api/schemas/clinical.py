from datetime import date, datetime
from typing import Annotated
from uuid import UUID

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


class ConsultationCreate(ClinicalStatusMixin):
    expediente_id: int
    paciente_id: int
    profesional_id: int
    motivo_consulta_id: int | None = None
    fecha_consulta: datetime | None = None
    motivo: str | None = Field(default=None, max_length=600)
    sintomas: str | None = Field(default=None, max_length=4000)
    evaluacion: str | None = Field(default=None, max_length=4000)
    indicaciones: str | None = Field(default=None, max_length=4000)
    observaciones: str | None = Field(default=None, max_length=4000)


class ConsultationUpdate(BaseModel):
    profesional_id: int | None = None
    motivo_consulta_id: int | None = None
    fecha_consulta: datetime | None = None
    motivo: str | None = Field(default=None, max_length=600)
    sintomas: str | None = Field(default=None, max_length=4000)
    evaluacion: str | None = Field(default=None, max_length=4000)
    indicaciones: str | None = Field(default=None, max_length=4000)
    observaciones: str | None = Field(default=None, max_length=4000)
    activo: bool | None = None


class ConsultationRead(BaseModel):
    id: int
    expediente_id: int
    paciente_id: int
    profesional_id: int
    motivo_consulta_id: int | None
    fecha_consulta: datetime
    motivo: str | None
    sintomas: str | None
    evaluacion: str | None
    indicaciones: str | None
    observaciones: str | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class VitalSignsCreate(BaseModel):
    temperatura_c: float | None = Field(default=None, ge=30, le=45)
    frecuencia_cardiaca: int | None = Field(default=None, ge=20, le=250)
    frecuencia_respiratoria: int | None = Field(default=None, ge=5, le=80)
    presion_sistolica: int | None = Field(default=None, ge=50, le=260)
    presion_diastolica: int | None = Field(default=None, ge=30, le=160)
    saturacion_oxigeno: int | None = Field(default=None, ge=50, le=100)
    peso_kg: float | None = Field(default=None, ge=1, le=500)
    talla_cm: float | None = Field(default=None, ge=30, le=250)
    glucosa_mg_dl: int | None = Field(default=None, ge=20, le=800)
    registrado_at: datetime | None = None


class VitalSignsRead(BaseModel):
    id: int
    consulta_id: int
    temperatura_c: float | None
    frecuencia_cardiaca: int | None
    frecuencia_respiratoria: int | None
    presion_sistolica: int | None
    presion_diastolica: int | None
    saturacion_oxigeno: int | None
    peso_kg: float | None
    talla_cm: float | None
    glucosa_mg_dl: int | None
    registrado_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ClinicalNoteCreate(ClinicalStatusMixin):
    contenido: Annotated[str, Field(min_length=1, max_length=5000)]


class ClinicalNoteUpdate(BaseModel):
    contenido: Annotated[str, Field(min_length=1, max_length=5000)] | None = None
    activo: bool | None = None


class ClinicalNoteRead(BaseModel):
    id: int
    consulta_id: int
    autor_id: int
    contenido: str
    created_at: datetime
    updated_at: datetime
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class DiagnosisCreate(ClinicalStatusMixin):
    tipo_diagnostico_id: int
    descripcion: Annotated[str, Field(min_length=1, max_length=700)]
    es_principal: bool = False
    fecha_diagnostico: date | None = None


class DiagnosisUpdate(BaseModel):
    tipo_diagnostico_id: int | None = None
    descripcion: Annotated[str, Field(min_length=1, max_length=700)] | None = None
    es_principal: bool | None = None
    fecha_diagnostico: date | None = None
    activo: bool | None = None


class DiagnosisRead(BaseModel):
    id: int
    consulta_id: int
    expediente_id: int
    profesional_id: int
    tipo_diagnostico_id: int
    descripcion: str
    es_principal: bool
    fecha_diagnostico: date
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class ConditionCreate(ClinicalStatusMixin):
    estado_condicion_id: int
    nombre: ShortText
    descripcion: str | None = Field(default=None, max_length=2000)
    diagnostico_id: int | None = None
    fecha_inicio: date | None = None
    motivo_historial: str | None = Field(default=None, max_length=300)


class ConditionUpdate(BaseModel):
    estado_condicion_id: int | None = None
    nombre: ShortText | None = None
    descripcion: str | None = Field(default=None, max_length=2000)
    diagnostico_id: int | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    activo: bool | None = None
    motivo_historial: str | None = Field(default=None, max_length=300)


class ConditionRead(BaseModel):
    id: int
    expediente_id: int
    paciente_id: int
    diagnostico_id: int | None
    estado_condicion_id: int
    nombre: str
    descripcion: str | None
    fecha_inicio: date | None
    fecha_fin: date | None
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class ConditionHistoryRead(BaseModel):
    id: int
    condicion_id: int
    estado_anterior_id: int | None
    estado_nuevo_id: int | None
    accion: str
    motivo: str | None
    usuario_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ConsultationClinicalSummary(BaseModel):
    consulta: ConsultationRead
    signos_vitales: list[VitalSignsRead]
    notas: list[ClinicalNoteRead]
    diagnosticos: list[DiagnosisRead]


class ClinicalPrescriptionSummary(BaseModel):
    id: str
    profesional_id: int
    consulta_id: int | None
    estado_id: int
    titulo: str | None
    fecha_emision: datetime
    vigencia_hasta: datetime | None
    model_config = ConfigDict(from_attributes=True)


class ClinicalMeasurementSummary(BaseModel):
    id: UUID
    indicador_id: UUID
    indicador_nombre: str
    valor: float
    unidad_medida_id: int
    unidad_medida: str
    origen_registro_id: int
    fecha_medicion: datetime
    observaciones: str | None = None


class ClinicalAlertSummary(BaseModel):
    id: UUID
    medicion_id: UUID
    nivel_severidad_id: int
    nivel_severidad: str
    tipo_alerta_id: int
    tipo_alerta: str
    mensaje: str
    atendida: bool
    fecha_alerta: datetime
    fecha_atencion: datetime | None = None


class PatientClinicalSummary(BaseModel):
    paciente_id: int
    expediente: MedicalRecordRead | None
    antecedentes: list[MedicalHistoryRead]
    alergias: list[AllergyRead]
    discapacidades: list[DisabilityRead]
    condiciones: list[ConditionRead]
    consultas: list[ConsultationClinicalSummary]
    recetas: list[ClinicalPrescriptionSummary]
    mediciones: list[ClinicalMeasurementSummary]
    alertas: list[ClinicalAlertSummary]


class ClinicalTimelineItem(BaseModel):
    occurred_at: datetime
    tipo: str
    titulo: str
    detalle: str | None = None
    entidad: str
    entidad_id: str


class ClinicalSearchResult(BaseModel):
    tipo: str
    entidad: str
    entidad_id: str
    paciente_id: int
    expediente_id: int | None = None
    titulo: str
    detalle: str | None = None
    occurred_at: datetime | None = None
