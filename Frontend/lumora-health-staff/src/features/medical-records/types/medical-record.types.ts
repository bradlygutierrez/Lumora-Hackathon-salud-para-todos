export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

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

export type ClinicalConsultation = {
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

export type ClinicalVitalSigns = {
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
