import { useIndicatorHistory } from '@/features/health-indicators/hooks/useIndicatorHistory';
import type {
  MeasurementHistoryEntry,
  RangeEvaluation,
} from '@/features/health-indicators/types/health-indicators.types';
import {
  useMeasurementUnitCatalog,
  useRecordOriginCatalog,
} from '@/features/prescriptions/hooks/useCatalog';

export type ResolvedHistoryEntry = {
  id: string;
  valor: number;
  unidadNombre: string;
  origenNombre: string;
  fechaMedicion: string;
  observaciones: string | null;
  evaluacion: RangeEvaluation;
};

export type TrendPoint = {
  valor: number;
  fechaMedicion: string;
};

/**
 * `useIndicatorHistory` + resolución de nombres de catálogo (unidad,
 * origen) -- mismo criterio que usePrescriptionDetail (A07): los IDs se
 * traducen a texto legible reutilizando los catálogos ya existentes.
 */
export function useResolvedIndicatorHistory(indicadorId: string) {
  const history = useIndicatorHistory(indicadorId);
  const unitsCatalog = useMeasurementUnitCatalog();
  const originCatalog = useRecordOriginCatalog();

  function resolve(entry: MeasurementHistoryEntry): ResolvedHistoryEntry {
    return {
      id: entry.id,
      valor: entry.valor,
      unidadNombre: unitsCatalog.nameById(entry.unidad_medida_id),
      origenNombre: originCatalog.nameById(entry.origen_registro_id),
      fechaMedicion: entry.fecha_medicion,
      observaciones: entry.observaciones,
      evaluacion: entry.evaluacion,
    };
  }

  const entries: ResolvedHistoryEntry[] = history.entries.map(resolve);
  const ultimaMedicion = history.ultimaMedicion ? resolve(history.ultimaMedicion) : null;
  const tendencia: TrendPoint[] = history.tendencia.map((entry) => ({
    valor: entry.valor,
    fechaMedicion: entry.fecha_medicion,
  }));

  const unidadIndicador = unitsCatalog.nameById(
    history.indicador?.unidad_medida_id ?? -1,
  );

  const isLoading =
    history.isLoading || unitsCatalog.isLoading || originCatalog.isLoading;
  const isError = history.isError || unitsCatalog.isError || originCatalog.isError;

  return {
    indicador: history.indicador,
    unidadIndicador,
    entries,
    ultimaMedicion,
    tendencia,
    isLoading,
    isError,
    refetch: history.refetch,
  };
}
