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
