export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type CatalogItem = {
  id: number;
  nombre: string;
};

export type PatientAddress = {
  id: number;
  linea_1: string;
  ciudad: string;
  departamento: string | null;
  pais: string;
  codigo_postal: string | null;
  es_principal: boolean;
};

export type PatientPerson = {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
  email: string | null;
  sexo_id: number | null;
  direcciones: PatientAddress[];
};

export type EmergencyContact = {
  id: number;
  paciente_id: number;
  nombre: string;
  parentesco: string;
  telefono: string;
  email: string | null;
};

export type Patient = {
  id: number;
  tipo_sangre_id: number | null;
  alergias: string | null;
  persona: PatientPerson;
};

export type PatientDetail = Patient & {
  contactos_emergencia: EmergencyContact[];
};

export type PatientFamilyRelationship = {
  id: number;
  usuario_relacionado_id: number;
  nombres: string;
  apellidos: string;
  tipo_relacion_id: number;
  tipo_relacion: string;
  recibir_notificaciones: boolean;
  estado: 'pending' | 'active' | 'revoked' | 'inactive' | 'rejected';
  nivel_acceso: 'read' | 'write';
  expira_en: string | null;
};

export type PatientListParams = {
  search?: string;
  sexo_id?: number;
  tipo_sangre_id?: number;
  limit?: number;
  offset?: number;
};

export type StaffPatientRegistrationPayload = {
  persona: {
    nombres: string;
    apellidos: string;
    email?: string;
    fecha_nacimiento: string;
    telefono: string;
    sexo_id: number;
    direccion: {
      linea_1: string;
      ciudad: string;
      departamento?: string;
      pais: string;
      codigo_postal?: string;
      es_principal: boolean;
    };
  };
  tipo_sangre_id?: number;
  alergias?: string;
  contacto_emergencia: {
    nombre: string;
    parentesco: string;
    telefono: string;
    email?: string;
  };
};

export type PatientClinicalSummary = {
  paciente_id: number;
  expediente: {
    id: number;
    paciente_id: number;
    estado_expediente_id: number;
    numero_expediente: string;
    notas: string | null;
    activo: boolean;
  } | null;
};
