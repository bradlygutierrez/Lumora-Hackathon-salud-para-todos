import type {
  ClinicalNote,
  Consultation,
  ConsultationReason,
  Page,
  VitalSigns,
} from '@/src/shared/types/clinical';

export type { ClinicalNote, Consultation, ConsultationReason, Page, VitalSigns };

export type ConsultationCreate = {
  expediente_id: number;
  paciente_id: number;
  profesional_id: number;
  motivo_consulta_id?: number | null;
  fecha_consulta?: string | null;
  motivo?: string | null;
  sintomas?: string | null;
  evaluacion?: string | null;
  indicaciones?: string | null;
  observaciones?: string | null;
  activo?: boolean;
};

export type ConsultationUpdate = {
  profesional_id?: number | null;
  motivo_consulta_id?: number | null;
  fecha_consulta?: string | null;
  motivo?: string | null;
  sintomas?: string | null;
  evaluacion?: string | null;
  indicaciones?: string | null;
  observaciones?: string | null;
  activo?: boolean | null;
};

export type ConsultationListParams = {
  limit?: number;
  offset?: number;
  expediente_id?: number;
  paciente_id?: number;
  profesional_id?: number;
  activo?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
};

export type RecordConsultationListParams = Pick<
  ConsultationListParams,
  'limit' | 'offset' | 'activo'
>;

export type VitalSignsListParams = {
  limit?: number;
  offset?: number;
};

export type VitalSignsCreate = {
  temperatura_c?: number | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  presion_sistolica?: number | null;
  presion_diastolica?: number | null;
  saturacion_oxigeno?: number | null;
  peso_kg?: number | null;
  talla_cm?: number | null;
  glucosa_mg_dl?: number | null;
  registrado_at?: string | null;
};

export type ClinicalNoteListParams = {
  limit?: number;
  offset?: number;
  activo?: boolean;
};

export type ClinicalNoteCreate = {
  contenido: string;
  activo?: boolean;
};

export type ClinicalNoteUpdate = {
  contenido?: string | null;
  activo?: boolean | null;
};

export type ConsultationReasonListParams = {
  limit?: number;
  offset?: number;
  activo?: boolean;
};
