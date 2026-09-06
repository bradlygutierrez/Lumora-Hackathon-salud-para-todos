/**
 * A15/B15 -- tipos del expediente médico documental.
 *
 * Reflejan tal cual el DTO que arma el backend
 * (Backend/.../schemas/clinical.py::PatientClinicalDocument). El
 * frontend NO reconstruye reglas clínicas: solo renderiza estas
 * secciones exactamente como llegan.
 */

export type MedicalRecordPatientIdentity = {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  sexo_id: number | null;
};

export type MedicalRecordEntry = {
  id: number;
  paciente_id: number;
  estado_expediente_id: number;
  numero_expediente: string;
  notas: string | null;
  activo: boolean;
};

export type MedicalHistoryEntry = {
  id: number;
  expediente_id: number;
  tipo_antecedente_id: number;
  descripcion: string;
  fecha: string | null;
  activo: boolean;
};

export type AllergyEntry = {
  id: number;
  paciente_id: number;
  nombre: string;
  nivel_severidad_id: number | null;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type DisabilityEntry = {
  id: number;
  paciente_id: number;
  nombre: string;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type ConditionEntry = {
  id: number;
  expediente_id: number;
  paciente_id: number;
  diagnostico_id: number | null;
  estado_condicion_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
};

export type VitalSignsEntry = {
  id: number;
  consulta_id: number;
  temperatura_c: number | null;
  frecuencia_cardiaca: number | null;
  frecuencia_respiratoria: number | null;
  presion_sistolica: number | null;
  presion_diastolica: number | null;
  saturacion_oxigeno: number | null;
  peso_kg: number | null;
  talla_cm: number | null;
  glucosa_mg_dl: number | null;
  registrado_at: string;
};

export type ClinicalNoteEntry = {
  id: number;
  consulta_id: number;
  autor_id: number;
  contenido: string;
  created_at: string;
  updated_at: string;
  activo: boolean;
};

export type DiagnosisEntry = {
  id: number;
  consulta_id: number;
  expediente_id: number;
  profesional_id: number;
  tipo_diagnostico_id: number;
  descripcion: string;
  es_principal: boolean;
  fecha_diagnostico: string;
  activo: boolean;
};

export type ConsultationEntry = {
  id: number;
  expediente_id: number;
  paciente_id: number;
  profesional_id: number;
  motivo_consulta_id: number | null;
  fecha_consulta: string;
  motivo: string | null;
  sintomas: string | null;
  evaluacion: string | null;
  indicaciones: string | null;
  observaciones: string | null;
  activo: boolean;
};

export type ConsultationSummaryEntry = {
  consulta: ConsultationEntry;
  signos_vitales: VitalSignsEntry[];
  notas: ClinicalNoteEntry[];
  diagnosticos: DiagnosisEntry[];
};

export type PrescriptionSummaryEntry = {
  id: string;
  profesional_id: number;
  consulta_id: number | null;
  estado_id: number;
  titulo: string | null;
  fecha_emision: string;
  vigencia_hasta: string | null;
};

export type MeasurementSummaryEntry = {
  id: string;
  indicador_id: string;
  indicador_nombre: string;
  valor: number;
  unidad_medida_id: number;
  unidad_medida: string;
  origen_registro_id: number;
  fecha_medicion: string;
  observaciones: string | null;
};

export type AlertSummaryEntry = {
  id: string;
  medicion_id: string;
  nivel_severidad_id: number;
  nivel_severidad: string;
  tipo_alerta_id: number;
  tipo_alerta: string;
  mensaje: string;
  atendida: boolean;
  fecha_alerta: string;
  fecha_atencion: string | null;
};

export type MedicalRecordDocument = {
  paciente_id: number;
  paciente: MedicalRecordPatientIdentity;
  expediente: MedicalRecordEntry | null;
  antecedentes: MedicalHistoryEntry[];
  alergias: AllergyEntry[];
  discapacidades: DisabilityEntry[];
  condiciones: ConditionEntry[];
  consultas: ConsultationSummaryEntry[];
  recetas: PrescriptionSummaryEntry[];
  mediciones: MeasurementSummaryEntry[];
  alertas: AlertSummaryEntry[];
  generado_en: string;
  autor: string | null;
};
