import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { remindersApi } from '@/features/reminders/api/reminders-api';
import type { CatalogPage } from '@/features/reminders/types/reminders.types';

const CATALOG_STALE_TIME = 24 * 60 * 60 * 1000;

type CatalogLookup = UseQueryResult<CatalogPage> & {
  idByName: (nombre: string) => number | undefined;
};

/**
 * GET /tipos-recordatorio
 *
 * Resuelve el id de "Seguimiento" (Beber Agua, Vitamina D, etc.) sin
 * dejarlo fijo en el código -- mismo patrón que
 * features/prescriptions/hooks/useCatalog.ts.
 */
export function useReminderTypeCatalog(): CatalogLookup {
  const query = useQuery({
    queryKey: ['reminders-catalog', 'tipos-recordatorio'],
    queryFn: () => remindersApi.getReminderTypes(),
    staleTime: CATALOG_STALE_TIME,
  });

  const idByName = new Map<string, number>();
  for (const item of query.data?.items ?? []) {
    idByName.set(item.nombre, item.id);
  }

  return {
    ...query,
    idByName: (nombre: string) => idByName.get(nombre),
  };
}
