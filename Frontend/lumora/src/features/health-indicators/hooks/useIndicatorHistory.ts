import { useQuery } from '@tanstack/react-query';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import { useIndicatorsCatalog } from '@/features/health-indicators/hooks/useIndicatorsCatalog';
import { usePatientId } from '@/features/health-indicators/hooks/usePatientId';
import type { MeasurementHistoryEntry } from '@/features/health-indicators/types/health-indicators.types';

/** Cuántos registros entran en la mini gráfica de "Tendencia". */
const TREND_ENTRIES_COUNT = 7;

/**
 * GET .../measurements + .../alerts de UN indicador para el paciente
 * actual, combinados en el historial que pinta "Historial de Indicador".
 *
 * "fuera_de_rango" se decide por si el backend generó una AlertaClinica
 * para esa medición (GET /alerts sin filtrar por pendientes: una alerta ya
 * atendida sigue siendo evidencia de que el valor estuvo fuera de rango en
 * su momento) -- así se refleja la alerta que evaluó FastAPI en vez de
 * recalcular el rango solo en el cliente (ver
 * Backend/.../services/health_indicators_service.py::registrar_medicion).
 */
export function useIndicatorHistory(indicadorId: string) {
  const { pacienteId, isLoading: isPatientLoading, isError: isPatientError } =
    usePatientId();
  const {
    getById,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
  } = useIndicatorsCatalog();

  const measurementsQuery = useQuery({
    queryKey: ['health-indicator-measurements', pacienteId],
    queryFn: () =>
      healthIndicatorsApi.getPatientMeasurements(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const alertsQuery = useQuery({
    queryKey: ['health-indicator-alerts', pacienteId],
    queryFn: () =>
      healthIndicatorsApi.getPatientAlerts(pacienteId as number, false),
    enabled: pacienteId !== undefined,
  });

  const indicador = getById(indicadorId);

  const medicionesIdsConAlerta = new Set(
    (alertsQuery.data ?? []).map((alerta) => alerta.medicion_id),
  );

  const entries: MeasurementHistoryEntry[] = (measurementsQuery.data ?? [])
    .filter((medicion) => medicion.indicador_id === indicadorId)
    .map((medicion) => ({
      ...medicion,
      evaluacion: medicionesIdsConAlerta.has(medicion.id)
        ? ('fuera_de_rango' as const)
        : indicador?.rango
          ? ('normal' as const)
          : ('sin_rango' as const),
    }))
    .sort(
      (a, b) =>
        new Date(b.fecha_medicion).getTime() -
        new Date(a.fecha_medicion).getTime(),
    );

  const ultimaMedicion = entries[0] ?? null;

  // "Tendencia (últimos 7 días)": se toman los últimos N REGISTROS (no los
  // últimos 7 días calendario), para que la gráfica siempre muestre algo
  // útil aunque el paciente no mida todos los días. `entries` viene de más
  // reciente a más antiguo; se invierte para que la gráfica quede en orden
  // cronológico (izquierda = más antiguo).
  const tendencia = [...entries].reverse().slice(-TREND_ENTRIES_COUNT);

  const isLoading =
    isPatientLoading ||
    isCatalogLoading ||
    measurementsQuery.isLoading ||
    alertsQuery.isLoading;

  const isError =
    isPatientError ||
    isCatalogError ||
    measurementsQuery.isError ||
    alertsQuery.isError;

  return {
    indicador,
    entries,
    ultimaMedicion,
    tendencia,
    isLoading,
    isError,
    refetch: () => {
      void measurementsQuery.refetch();
      void alertsQuery.refetch();
    },
  };
}
