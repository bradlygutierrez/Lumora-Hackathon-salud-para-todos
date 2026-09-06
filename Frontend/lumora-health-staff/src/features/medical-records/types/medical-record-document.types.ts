export type DocumentCatalogRef = {
  id: number;
  nombre: string;
};

export type DocumentProfessional = {
  id: number;
  nombre_completo: string;
  especialidad: string;
};

export type DocumentPatient = {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  sexo: DocumentCatalogRef | null;
  tipo_sangre: DocumentCatalogRef | null;
};

export type DocumentRecord = {
  id: number;
  numero_expediente: string;
  estado: DocumentCatalogRef;
  fecha_apertura: string;
};

export type DocumentAllergy = {
  id: number;
  nombre: string;
  severidad: DocumentCatalogRef | null;
  estado: DocumentCatalogRef | null;
  observaciones: string | null;
};

export type DocumentDisability = {
  id: number;
  nombre: string;
  estado: DocumentCatalogRef | null;
  observaciones: string | null;
};

export type DocumentHistory = {
  id: number;
  tipo: DocumentCatalogRef;
  descripcion: string;
  fecha: string | null;
};

export type DocumentCondition = {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: DocumentCatalogRef;
  diagnostico_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

export type DocumentVitalSigns = {
  id: number;
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

export type DocumentDiagnosis = {
  id: number;
  descripcion: string;
  tipo: DocumentCatalogRef;
  es_principal: boolean;
  fecha_diagnostico: string;
  profesional: DocumentProfessional;
};

export type DocumentConsultation = {
  id: number;
  fecha_consulta: string;
  motivo: string | null;
  motivo_consulta: DocumentCatalogRef | null;
  sintomas: string | null;
  evaluacion: string | null;
  indicaciones: string | null;
  observaciones: string | null;
  profesional: DocumentProfessional;
  signos_vitales: DocumentVitalSigns[];
  diagnosticos: DocumentDiagnosis[];
};

export type DocumentMedication = {
  id: string;
  nombre: string;
  nombre_generico: string | null;
  presentacion: string | null;
  concentracion: string | null;
};

export type DocumentPrescriptionDetail = {
  id: string;
  medicamento: DocumentMedication;
  dosis: string;
  frecuencia: string;
  duracion_dias: number;
  cantidad_total: number;
  instrucciones: string | null;
  unidad_medida: DocumentCatalogRef;
  via_administracion: DocumentCatalogRef;
};

export type DocumentPrescription = {
  id: string;
  titulo: string | null;
  estado: DocumentCatalogRef;
  fecha_emision: string;
  vigencia_hasta: string | null;
  observaciones: string | null;
  consulta_id: number | null;
  profesional: DocumentProfessional;
  detalles: DocumentPrescriptionDetail[];
};

export type DocumentMeasurement = {
  id: string;
  indicador_id: string;
  indicador_nombre: string;
  valor: number;
  unidad_medida: DocumentCatalogRef;
  origen_registro: DocumentCatalogRef;
  fecha_medicion: string;
  observaciones: string | null;
};

export type MedicalRecordDocument = {
  generated_at: string;
  paciente: DocumentPatient;
  expediente: DocumentRecord | null;
  antecedentes: DocumentHistory[];
  alergias: DocumentAllergy[];
  discapacidades: DocumentDisability[];
  condiciones: DocumentCondition[];
  consultas: DocumentConsultation[];
  recetas: DocumentPrescription[];
  indicadores: DocumentMeasurement[];
};

export type MedicalRecordPdfPayload = {
  bytes: Uint8Array;
  filename: string;
};
