/**
 * Tipos de la feature de Indicadores de Salud (A08).
 *
 * Reflejan literalmente los schemas Pydantic del backend
 * (Backend/src/lumora_api/schemas/health_indicators.py). No se inventan
 * campos que el backend no devuelve.
 */

// --- Indicadores médicos (catálogo) ---

export type IndicadorMedicoResponse = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida_id: number;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
};

// --- Rangos saludables ---

export type RangoIndicadorResponse = {
  id: string;
  indicador_id: string;
  nivel_severidad_id: number;
  valor_minimo: number | null;
  valor_maximo: number | null;
  etiqueta: string;
  activo: boolean;
};

// --- Mediciones ---

export type MedicionIndicadorCreate = {
  indicador_id: string;
  valor: number;
  unidad_medida_id: number;
  origen_registro_id: number;
  observaciones?: string | null;
};

export type MedicionIndicadorResponse = {
  id: string;
  paciente_id: number;
  indicador_id: string;
  valor: number;
  unidad_medida_id: number;
  origen_registro_id: number;
  registrado_por_id: number;
  fecha_medicion: string;
  observaciones: string | null;
};

// --- Alertas clínicas ---

export type AlertaClinicaResponse = {
  id: string;
  paciente_id: number;
  medicion_id: string;
  nivel_severidad_id: number;
  tipo_alerta_id: number;
  origen_registro_id: number;
  mensaje: string;
  atendida: boolean;
  atendida_por_id: number | null;
  fecha_alerta: string;
  fecha_atencion: string | null;
};

// --- Modelos de UI derivados (no vienen así del backend) ---

/**
 * Resultado de comparar un valor contra el `RangoIndicador` activo de su
 * indicador.
 *
 * 'sin_rango' cubre el caso de "Peso", que a propósito no tiene un rango
 * saludable universal (ver Backend/.../db/seed.py::seed_health_indicators).
 */
export type RangeEvaluation = 'normal' | 'fuera_de_rango' | 'sin_rango';

export type IndicatorWithRange = IndicadorMedicoResponse & {
  /** `null` cuando el indicador no tiene un rango saludable definido (ej. Peso). */
  rango: RangoIndicadorResponse | null;
};

export type MeasurementHistoryEntry = MedicionIndicadorResponse & {
  evaluacion: RangeEvaluation;
};
