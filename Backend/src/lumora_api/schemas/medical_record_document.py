from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class CatalogRef(BaseModel):
    id: int
    nombre: str


class ProfessionalDocumentRead(BaseModel):
    id: int
    nombre_completo: str
    especialidad: str


class PatientDocumentRead(BaseModel):
    id: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date | None
    sexo: CatalogRef | None
    tipo_sangre: CatalogRef | None


class RecordDocumentRead(BaseModel):
    id: int
    numero_expediente: str
    estado: CatalogRef
    fecha_apertura: datetime


class AllergyDocumentRead(BaseModel):
    id: int
    nombre: str
    severidad: CatalogRef | None
    estado: CatalogRef | None
    observaciones: str | None


class DisabilityDocumentRead(BaseModel):
    id: int
    nombre: str
    estado: CatalogRef | None
    observaciones: str | None


class HistoryDocumentRead(BaseModel):
    id: int
    tipo: CatalogRef
    descripcion: str
    fecha: date | None


class ConditionDocumentRead(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    estado: CatalogRef
    diagnostico_id: int | None
    fecha_inicio: date | None
    fecha_fin: date | None


class VitalSignsDocumentRead(BaseModel):
    id: int
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


class DiagnosisDocumentRead(BaseModel):
    id: int
    descripcion: str
    tipo: CatalogRef
    es_principal: bool
    fecha_diagnostico: date
    profesional: ProfessionalDocumentRead


class ConsultationDocumentRead(BaseModel):
    id: int
    fecha_consulta: datetime
    motivo: str | None
    motivo_consulta: CatalogRef | None
    sintomas: str | None
    evaluacion: str | None
    indicaciones: str | None
    observaciones: str | None
    profesional: ProfessionalDocumentRead
    signos_vitales: list[VitalSignsDocumentRead]
    diagnosticos: list[DiagnosisDocumentRead]


class MedicationDocumentRead(BaseModel):
    id: str
    nombre: str
    nombre_generico: str | None
    presentacion: str | None
    concentracion: str | None


class PrescriptionDetailDocumentRead(BaseModel):
    id: str
    medicamento: MedicationDocumentRead
    dosis: str
    frecuencia: str
    duracion_dias: int
    cantidad_total: int
    instrucciones: str | None
    unidad_medida: CatalogRef
    via_administracion: CatalogRef


class PrescriptionDocumentRead(BaseModel):
    id: str
    titulo: str | None
    estado: CatalogRef
    fecha_emision: datetime
    vigencia_hasta: datetime | None
    observaciones: str | None
    consulta_id: int | None
    profesional: ProfessionalDocumentRead
    detalles: list[PrescriptionDetailDocumentRead]


class MeasurementDocumentRead(BaseModel):
    id: UUID
    indicador_id: UUID
    indicador_nombre: str
    valor: float
    unidad_medida: CatalogRef
    origen_registro: CatalogRef
    fecha_medicion: datetime
    observaciones: str | None


class MedicalRecordDocumentRead(BaseModel):
    generated_at: datetime
    paciente: PatientDocumentRead
    expediente: RecordDocumentRead | None
    antecedentes: list[HistoryDocumentRead]
    alergias: list[AllergyDocumentRead]
    discapacidades: list[DisabilityDocumentRead]
    condiciones: list[ConditionDocumentRead]
    consultas: list[ConsultationDocumentRead]
    recetas: list[PrescriptionDocumentRead]
    indicadores: list[MeasurementDocumentRead]
