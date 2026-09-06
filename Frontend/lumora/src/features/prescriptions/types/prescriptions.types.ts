/**
 * Tipos de la feature de Recetas y Medicación (A07).
 *
 * Reflejan literalmente los schemas Pydantic del backend
 * (Backend/src/lumora_api/schemas/prescriptions.py y schemas/schedules.py).
 * No se inventan campos que el backend no devuelve.
 */

// --- Catálogos genéricos (create_catalog_router) ---

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

// --- Identidad (subconjunto usado por esta feature) ---

export type PersonRead = {
  id: number;
  nombres: string;
  apellidos: string;
};

export type ProfessionalRead = {
  id: number;
  especialidad: string;
  numero_licencia: string;
  persona: PersonRead;
};

export type PatientRead = {
  id: number;
  tipo_sangre_id: number | null;
  alergias: string | null;
  persona: PersonRead;
};

// --- Medicamentos ---

export type MedicamentoResponse = {
  id: string;
  nombre: string;
  nombre_generico: string | null;
  presentacion: string | null;
  concentracion: string | null;
  fabricante: string | null;
  activo: boolean;
  created_at: string;
};

// --- Detalle de receta ---

export type DetalleRecetaResponse = {
  id: string;
  receta_id: string;
  medicamento_id: string;
  unidad_medida_id: number;
  via_administracion_id: number;
  dosis: string;
  frecuencia: string;
  duracion_dias: number;
  cantidad_total: number;
  instrucciones: string | null;
};

// --- Receta ---

export type RecetaResponse = {
  id: string;
  paciente_id: number;
  profesional_id: number;
  consulta_id: number | null;
  estado_id: number;
  titulo: string | null;
  fecha_emision: string;
  vigencia_hasta: string | null;
  observaciones: string | null;
  created_at: string;
  detalles: DetalleRecetaResponse[];
  profesional: ProfessionalRead;
};

// --- Horarios de medicamento ---

export type HorarioMedicamentoResponse = {
  id: string;
  detalle_receta_id: string;
  /** Formato "HH:MM:SS" (pydantic `time`). */
  hora: string;
  activo: boolean;
  created_at: string;
};

// --- Dosis administradas ---

export type DosisAdministradaResponse = {
  id: string;
  horario_id: string;
  estado_dosis_id: number;
  fecha_programada: string;
  fecha_registro: string;
  responsable_id: number;
  origen_registro_id: number;
  observaciones: string | null;
};

export type DosisAdministradaCreate = {
  estado_dosis_id: number;
  fecha_programada: string;
  /** El backend lo exige y NO lo infiere (a diferencia de horario_id/responsable_id). */
  origen_registro_id: number;
  observaciones?: string | null;
};

// --- Modelos de UI derivados (no vienen así del backend) ---

export type TimeOfDayBucket = 'manana' | 'tarde' | 'noche';

export type DoseStatus = 'tomada' | 'pospuesta' | 'omitida' | 'pendiente';

export type TodayMedicationItem = {
  horarioId: string;
  detalleRecetaId: string;
  recetaId: string;
  medicamentoNombre: string;
  dosis: string;
  frecuencia: string;
  hora: string;
  status: DoseStatus;
  /** id de la dosis ya registrada hoy, si existe (para no duplicar). */
  dosisHoyId: string | null;
  /**
   * `fecha_programada` del registro de hoy más reciente (si existe),
   * ej. cuando `status` es 'pospuesta' esta es la NUEVA hora elegida en
   * el modal de Posponer -- el tablero de Recordatorios la usa para que
   * la tarjeta reaparezca a esa hora en vez de a la hora original.
   */
  dosisHoyFechaProgramada: string | null;
  instrucciones: string | null;
};

export type TodayMedicationPlan = {
  sections: Record<TimeOfDayBucket, TodayMedicationItem[]>;
  completedCount: number;
  totalCount: number;
};
