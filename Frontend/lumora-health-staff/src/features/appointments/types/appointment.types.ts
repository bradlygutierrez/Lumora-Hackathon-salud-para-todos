export type CatalogItem = {
  id: number;
  nombre: string;
};

export type AppointmentLocation = {
  id: number;
  nombre: string;
  direccion: string;
  consultorio: string | null;
  latitud: number | null;
  longitud: number | null;
};

export type ProfessionalAgendaItem = {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  inicio: string;
  fin: string;
  notas: string | null;
  estado: CatalogItem | null;
  tipo_cita: CatalogItem | null;
  ubicacion: AppointmentLocation | null;
};

export type ProfessionalSchedule = {
  id: number;
  profesional_id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

export type ProfessionalSchedulePayload = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo?: boolean;
};

export type ProfessionalAvailability = {
  fecha: string;
  slots: {
    inicio: string;
    fin: string;
    disponible: boolean;
  }[];
};

export type AppointmentProfessional = {
  id: number;
  full_name: string;
  specialty: string;
  profile_image_url: string | null;
};

export type AppointmentDetail = {
  id: number;
  paciente_id: number;
  profesional_id: number;
  tipo_cita_id: number | null;
  estado_cita_id: number | null;
  inicio: string;
  fin: string;
  notas: string | null;
  ubicacion_id: number | null;
  created_at: string;
  updated_at: string;
  professional: AppointmentProfessional | null;
  status: CatalogItem | null;
  appointment_type: CatalogItem | null;
  location: AppointmentLocation | null;
};
