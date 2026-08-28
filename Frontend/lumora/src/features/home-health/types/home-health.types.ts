import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

/**
 * Contratos de B10: Inicio + Mi Salud.
 *
 * Los DTO provenientes directamente de FastAPI
 * mantienen snake_case.
 */

// =========================================================
// HEALTH SUMMARY
// =========================================================

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

// =========================================================
// APPOINTMENTS
// =========================================================

/**
 * Información mínima y segura del profesional
 * incluida por B10 dentro de cada cita.
 */
export type AppointmentProfessionalSummary = {
  id: number;
  full_name: string;
  specialty: string;
};

/**
 * Contrato real de AppointmentRead.
 *
 * Backend:
 *
 * GET /api/v1/citas?paciente_id={patientId}
 */
export type AppointmentResponse = {
  id: number;

  paciente_id: number;
  profesional_id: number;

  /**
   * Puede ser null si por alguna razón la relación
   * con el profesional no está disponible.
   */
  professional:
    AppointmentProfessionalSummary | null;

  tipo_cita_id: number | null;
  estado_cita_id: number | null;

  inicio: string;
  fin: string;

  notas: string | null;

  created_at: string;
  updated_at: string;
};

// =========================================================
// GENERIC CATALOG
// =========================================================

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

// =========================================================
// MEDICATION
// =========================================================

/**
 * Modelo calculado por frontend.
 *
 * FastAPI todavía no expone una única ruta
 * "next dose", por eso B10 compone esta información
 * usando recetas, horarios y registros de dosis.
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

// =========================================================
// B10 DASHBOARD
// =========================================================

/**
 * Snapshot completo utilizado por:
 *
 * - Inicio Paciente
 * - Inicio Cuidador
 * - Mi Salud
 *
 * Todo está scoped al patientId seleccionado por B09.
 */
export type HomeHealthDashboardData = {
  patientId: number;

  healthSummary:
    HealthSummaryResponse;

  measurements:
    MedicionIndicadorResponse[];

  alerts:
    AlertaClinicaResponse[];

  indicators:
    IndicadorMedicoResponse[];

  measurementUnits:
    CatalogItem[];

  appointmentTypes:
    CatalogItem[];

  appointments:
    AppointmentResponse[];

  nextDose:
    NextDose | null;

  fetchedAt: string;
};

// =========================================================
// HEALTH METRICS
// =========================================================

/**
 * Modelo derivado utilizado para presentar
 * la última medición de cada indicador.
 */
export type HealthMetric = {
  indicatorId: string;

  name: string;

  value: string;

  unit: string;

  measuredAt: string;

  hasAlert: boolean;
};