import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

/**
 * Contratos propios de B10 — Inicio + Mi Salud.
 *
 * Los DTO que vienen directamente de FastAPI conservan snake_case.
 * Los modelos derivados para UI usan camelCase porque ya no representan
 * literalmente el contrato HTTP.
 */

export type AllergySummary = {
  id: number;
  name: string;
  description: string | null;
  severity: string | null;
  active: boolean;
};

export type ActiveConditionSummary = {
  id: number;
  name: string;
  description: string | null;
  diagnosed_at: string | null;
  status: string | null;
};

export type HealthSummaryResponse = {
  patient_id: number;
  allergies: AllergySummary[];
  active_conditions: ActiveConditionSummary[];
};

export type AppointmentResponse = {
  id: number;
  paciente_id: number;
  profesional_id: number;

  /**
   * Campo opcional preparado para el follow-up backend B10.
   * El contrato actual solo envía profesional_id; mientras no exista, la
   * UI usa un fallback sin inventar el nombre del profesional.
   */
  professional?: {
    id: number;
    full_name: string;
    specialty: string | null;
  };

  tipo_cita_id: number | null;
  estado_cita_id: number | null;
  inicio: string;
  fin: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Próxima dosis calculada a partir de recetas activas + horarios + logs.
 * No existe como DTO agregado en FastAPI, por eso es un modelo de UI.
 */
export type NextDose = {
  horarioId: string;
  detalleRecetaId: string;
  recetaId: string;
  medicationName: string;
  dose: string;
  instructions: string | null;
  scheduledAt: string;
  isOverdue: boolean;
};

/**
 * Snapshot único que comparten Inicio y Mi Salud.
 * La query siempre está scoped por patientId para soportar Paciente y
 * Cuidador autorizado sin reutilizar datos de otro contexto.
 */
export type HomeHealthDashboardData = {
  patientId: number;
  healthSummary: HealthSummaryResponse;
  measurements: MedicionIndicadorResponse[];
  alerts: AlertaClinicaResponse[];
  indicators: IndicadorMedicoResponse[];
  measurementUnits: CatalogItem[];
  appointmentTypes: CatalogItem[];
  appointments: AppointmentResponse[];
  nextDose: NextDose | null;
  fetchedAt: string;
};

export type HealthMetric = {
  indicatorId: string;
  name: string;
  value: string;
  unit: string;
  measuredAt: string;
  hasAlert: boolean;
};
