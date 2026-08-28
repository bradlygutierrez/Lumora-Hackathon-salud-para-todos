import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';
import type {
  CatalogPage,
  MedicamentoResponse,
} from '@/features/prescriptions/types/prescriptions.types';

/**
 * Catálogos de apoyo para Recetas y Medicación.
 *
 * Ninguno de estos IDs se deja fijo ("hardcodeado") en el código: cada
 * pantalla resuelve nombres/IDs consultando estos catálogos, que casi
 * nunca cambian, así que se cachean por 24h (`staleTime`).
 */
const CATALOG_STALE_TIME = 24 * 60 * 60 * 1000;

type CatalogFetcher = () => Promise<CatalogPage>;

type CatalogLookup = UseQueryResult<CatalogPage> & {
  /** Nombre legible a partir del id devuelto por el backend. */
  nameById: (id: number) => string;
  /** Id del catálogo a partir de su nombre exacto (ej. "Activa", "Tomada"). */
  idByName: (nombre: string) => number | undefined;
};

function useCatalogLookup(queryKey: string, fetcher: CatalogFetcher): CatalogLookup {
  const query = useQuery({
    queryKey: ['prescriptions-catalog', queryKey],
    queryFn: fetcher,
    staleTime: CATALOG_STALE_TIME,
  });

  const byId = new Map<number, string>();
  const idByName = new Map<string, number>();

  for (const item of query.data?.items ?? []) {
    byId.set(item.id, item.nombre);
    idByName.set(item.nombre, item.id);
  }

  return {
    ...query,
    nameById: (id: number) => byId.get(id) ?? 'Desconocido',
    idByName: (nombre: string) => idByName.get(nombre),
  };
}

/** GET /estados-receta */
export function usePrescriptionStatusCatalog(): CatalogLookup {
  return useCatalogLookup('estados-receta', () =>
    prescriptionsApi.getPrescriptionStatuses(),
  );
}

/** GET /estados-dosis */
export function useDoseStatusCatalog(): CatalogLookup {
  return useCatalogLookup('estados-dosis', () => prescriptionsApi.getDoseStatuses());
}

/** GET /origenes-registro */
export function useRecordOriginCatalog(): CatalogLookup {
  return useCatalogLookup('origenes-registro', () =>
    prescriptionsApi.getRecordOrigins(),
  );
}

/** GET /unidades-medida */
export function useMeasurementUnitCatalog(): CatalogLookup {
  return useCatalogLookup('unidades-medida', () =>
    prescriptionsApi.getMeasurementUnits(),
  );
}

/** GET /vias-administracion */
export function useAdministrationRouteCatalog(): CatalogLookup {
  return useCatalogLookup('vias-administracion', () =>
    prescriptionsApi.getAdministrationRoutes(),
  );
}

/**
 * GET /prescriptions/medications
 *
 * No usa `useCatalogLookup` porque el backend no lo pagina como los demás
 * catálogos (devuelve un arreglo plano de `MedicamentoResponse`, con `id`
 * de tipo string en vez de número).
 */
export function useMedicationsCatalog(): UseQueryResult<MedicamentoResponse[]> & {
  nameById: (id: string) => string;
} {
  const query = useQuery({
    queryKey: ['prescriptions-catalog', 'medications'],
    queryFn: () => prescriptionsApi.getMedications(),
    staleTime: CATALOG_STALE_TIME,
  });

  const byId = new Map<string, string>();
  for (const medicamento of query.data ?? []) {
    byId.set(medicamento.id, medicamento.nombre);
  }

  return {
    ...query,
    nameById: (id: string) => byId.get(id) ?? 'Medicamento',
  };
}
