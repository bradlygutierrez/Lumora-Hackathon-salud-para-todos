export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type Consultation = {
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

export type VitalSigns = {
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

export type ClinicalNote = {
  id: number;
  consulta_id: number;
  autor_id: number;
  contenido: string;
  created_at: string;
  updated_at: string;
  activo: boolean;
};

export type ConsultationReason = {
  id: number;
  nombre: string;
  activo: boolean;
};
