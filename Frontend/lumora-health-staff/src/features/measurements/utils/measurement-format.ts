import type {
  CatalogItem,
  HealthIndicator,
  PatientMeasurement,
} from '../types/measurement.types';

export function enrichMeasurements(
  measurements: PatientMeasurement[],
  indicators: HealthIndicator[],
  units: CatalogItem[],
  origins: CatalogItem[],
) {
  const indicatorMap = new Map(indicators.map((item) => [item.id, item.nombre]));
  const unitMap = new Map(units.map((item) => [item.id, item.nombre]));
  const originMap = new Map(origins.map((item) => [item.id, item.nombre]));
  return [...measurements]
    .sort(
      (a, b) =>
        new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime(),
    )
    .map((item) => ({
      ...item,
      indicador: indicatorMap.get(item.indicador_id) ?? 'Indicador clínico',
      unidad: unitMap.get(item.unidad_medida_id) ?? '',
      origen: originMap.get(item.origen_registro_id) ?? 'Origen no indicado',
    }));
}

export function trendDelta(values: number[]): number | null {
  if (values.length < 2) return null;
  return values[0] - values[1];
}
