import type {
  ClinicalNote as SharedClinicalNote,
  Consultation as SharedConsultation,
  Page,
  VitalSigns as SharedVitalSigns,
} from '@/src/shared/types/clinical';

export type { Page } from '@/src/shared/types/clinical';

export type ClinicalPatientIdentity = {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  sexo_id: number | null;
};

export type MedicalRecord = {
  id: number;
  paciente_id: number;
  estado_expediente_id: number;
  numero_expediente: string;
  notas: string | null;
  activo: boolean;
};

export type MedicalHistory = {
  id: number;
  expediente_id: number;
  tipo_antecedente_id: number;
  descripcion: string;
  fecha: string | null;
  activo: boolean;
};

export type ClinicalAllergy = {
  id: number;
  paciente_id: number;
  nombre: string;
  nivel_severidad_id: number | null;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type ClinicalDisability = {
  id: number;
  paciente_id: number;
  nombre: string;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type ClinicalCondition = {
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

export type ClinicalConsultation = SharedConsultation;

export type ClinicalVitalSigns = SharedVitalSigns;

export type ClinicalNote = SharedClinicalNote;

export type ClinicalDiagnosis = {
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

export type ConsultationClinicalSummary = {
  consulta: ClinicalConsultation;
  signos_vitales: ClinicalVitalSigns[];
  notas: ClinicalNote[];
  diagnosticos: ClinicalDiagnosis[];
};

export type ClinicalPrescriptionSummary = {
  id: string;
  profesional_id: number;
  consulta_id: number | null;
  estado_id: number;
  titulo: string | null;
  fecha_emision: string;
  vigencia_hasta: string | null;
};

export type ClinicalMeasurementSummary = {
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

export type ClinicalAlertSummary = {
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

export type PatientClinicalSummary = {
  paciente_id: number;
  paciente: ClinicalPatientIdentity;
  expediente: MedicalRecord | null;
  antecedentes: MedicalHistory[];
  alergias: ClinicalAllergy[];
  discapacidades: ClinicalDisability[];
  condiciones: ClinicalCondition[];
  consultas: ConsultationClinicalSummary[];
  recetas: ClinicalPrescriptionSummary[];
  mediciones: ClinicalMeasurementSummary[];
  alertas: ClinicalAlertSummary[];
};

export type ClinicalTimelineItem = {
  occurred_at: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  entidad: string;
  entidad_id: string;
};

export type MedicalTimelineParams = {
  limit?: number;
  offset?: number;
  tipo?: string;
};

export type ClinicalSectionId =
  | 'condiciones'
  | 'alergias'
  | 'discapacidades'
  | 'historial'
  | 'consultas'
  | 'diagnosticos'
  | 'recetas'
  | 'indicadores'
  | 'alertas';
