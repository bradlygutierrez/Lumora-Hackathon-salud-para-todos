/**
 * Tipos de la feature de Recordatorios (A10).
 *
 * `RecordatorioResponse` refleja literalmente
 * Backend/src/lumora_api/schemas/reminders.py::RecordatorioResponse. Los
 * campos objetivo_cantidad/progreso_actual/unidad solo se usan cuando
 * tipo_recordatorio es "Seguimiento" (ver models/reminders.py).
 */

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
 * Una hora del día elegida para repartir el `objetivo_cantidad` de un
 * recordatorio de Seguimiento con meta (ej. "Beber Agua" a las
 * 08:00/12:00/16:00/20:00) -- ver
 * Backend/.../schemas/reminders.py::RecordatorioHorarioResponse.
 */
export type RecordatorioHorarioResponse = {
  id: number;
  recordatorio_id: number;
  /** "HH:MM:SS". */
  hora: string;
  cantidad_objetivo: number | null;
  activo: boolean;
  cantidad_efectiva: number | null;
};

export type RecordatorioHorarioInput = {
  /** "HH:MM" o "HH:MM:SS". */
  hora: string;
  cantidad_objetivo?: number | null;
  activo?: boolean;
};

export type RecordatorioResponse = {
  id: number;
  paciente_id: number;
  tipo_recordatorio_id: number;
  horario_medicamento_id: number | null;
  cita_id: number | null;
  alerta_id: number | null;
  titulo: string;
  mensaje: string;
  fecha_programada: string;
  activo: boolean;
  objetivo_cantidad: number | null;
  progreso_actual: number | null;
  unidad: string | null;
  creado_en: string;
  /** Vacío en recordatorios de Rutina simple o creados antes de este feature. */
  horarios: RecordatorioHorarioResponse[];
};

export type RecordatorioCreate = {
  paciente_id: number;
  tipo_recordatorio_id: number;
  titulo: string;
  mensaje: string;
  fecha_programada: string;
  activo?: boolean;
  objetivo_cantidad?: number | null;
  progreso_actual?: number | null;
  unidad?: string | null;
  horarios?: RecordatorioHorarioInput[];
};

export type RecordatorioUpdate = {
  titulo?: string;
  mensaje?: string;
  fecha_programada?: string;
  activo?: boolean;
  progreso_actual?: number;
  objetivo_cantidad?: number | null;
  unidad?: string | null;
  /** Reemplaza POR COMPLETO las horas del recordatorio -- omitir el
   * campo deja las horas existentes intactas. */
  horarios?: RecordatorioHorarioInput[];
};

// --- Modelo de UI derivado: une dosis + citas + seguimiento en un solo
// tablero (no viene así del backend, se arma en useReminderBoard). ---

export type ReminderKind = 'dosis' | 'cita' | 'seguimiento';

export type ReminderPriority = 'urgente' | 'normal';

export type ReminderBoardItem = {
  id: string;
  kind: ReminderKind;
  /** Momento programado, usado para ordenar y agrupar. */
  scheduledAt: Date;
  priority: ReminderPriority;
  title: string;
  subtitle: string;
  instructions: string | null;
  done: boolean;

  /** Solo si kind === 'dosis'. */
  horarioId?: string;
  hora?: string;

  /** Solo si kind === 'seguimiento'. */
  recordatorioId?: number;
  objetivoCantidad?: number | null;
  progresoActual?: number | null;
  unidad?: string | null;
};

export type ReminderBoard = {
  proximamente: ReminderBoardItem[];
  masTarde: ReminderBoardItem[];
};
