export type AppointmentCatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

export type AppointmentCatalogPage = {
  items: AppointmentCatalogItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AppointmentProfessionalSummary = {
  id: number;
  full_name: string;
  specialty: string;
  profile_image_url?: string | null;
};

export type AppointmentLocation = {
  id: number;
  nombre: string;
  direccion: string;
  consultorio?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

export type AppointmentResponse = {
  id: number;
  paciente_id: number;
  profesional_id: number;
  tipo_cita_id: number | null;
  estado_cita_id: number | null;
  inicio: string;
  fin: string;
  notas: string | null;
  ubicacion_id?: number | null;
  created_at: string;
  updated_at: string;
  professional?: AppointmentProfessionalSummary | null;
  status?: AppointmentCatalogItem | null;
  appointment_type?: AppointmentCatalogItem | null;
  location?: AppointmentLocation | null;
};

export type AppointmentAvailabilitySlot = {
  inicio: string;
  fin: string;
  disponible: boolean;
};

export type AppointmentAvailability = {
  profesional_id: number;
  fecha: string;
  slots: AppointmentAvailabilitySlot[];
};

export type AppointmentCreateRequest = {
  paciente_id: number;
  profesional_id: number;
  tipo_cita_id: number;
  inicio: string;
  fin: string;
  notas?: string | null;
  ubicacion_id?: number | null;
};

export type AppointmentRescheduleRequest = {
  inicio: string;
  fin: string;
};

export type AppointmentCancelRequest = {
  motivo?: string | null;
};

export type ProfessionalFilters = {
  q?: string;
  specialty?: string;
};
