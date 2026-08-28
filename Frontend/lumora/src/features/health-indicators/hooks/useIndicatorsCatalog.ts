import { useQueries, useQuery } from '@tanstack/react-query';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';

const CATALOG_STALE_TIME = 24 * 60 * 60 * 1000;

/**
 * GET /health-indicators/indicators + su rango saludable activo (si tiene).
 *
 * El backend modela varios rangos por indicador -- uno por nivel de
 * severidad (ver models/health_indicators.py) -- pero el catálogo sembrado
 * hoy solo trae un rango "saludable" por indicador (ver
 * Backend/.../db/seed.py::seed_health_indicators), así que se usa el
 * primer rango activo como referencia. Si más adelante se agregan más
 * niveles, este es el lugar para resolver cuál mostrar.
 */
export function useIndicatorsCatalog() {
  const indicatorsQuery = useQuery({
    queryKey: ['health-indicators-catalog'],
    queryFn: () => healthIndicatorsApi.getIndicators(),
    staleTime: CATALOG_STALE_TIME,
  });

  const indicators = indicatorsQuery.data ?? [];

  const rangesQueries = useQueries({
    queries: indicators.map((indicador) => ({
      queryKey: ['health-indicators-ranges', indicador.id],
      queryFn: () => healthIndicatorsApi.getIndicatorRanges(indicador.id),
      staleTime: CATALOG_STALE_TIME,
    })),
  });

  const indicatorsWithRange: IndicatorWithRange[] = indicators.map(
    (indicador, index) => ({
      ...indicador,
      rango: rangesQueries[index]?.data?.[0] ?? null,
    }),
  );

  const isLoading =
    indicatorsQuery.isLoading || rangesQueries.some((query) => query.isLoading);

  const isError =
    indicatorsQuery.isError || rangesQueries.some((query) => query.isError);

  function getById(indicadorId: string): IndicatorWithRange | undefined {
    return indicatorsWithRange.find((indicador) => indicador.id === indicadorId);
  }

  return {
    indicators: indicatorsWithRange,
    getById,
    isLoading,
    isError,
    refetch: indicatorsQuery.refetch,
  };
}
