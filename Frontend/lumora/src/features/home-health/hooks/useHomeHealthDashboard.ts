import {
  useQuery,
} from '@tanstack/react-query';

import {
  homeHealthService,
} from '@/features/home-health/api/HomeHealthService';

import {
  homeHealthQueryKeys,
} from '@/features/home-health/query/home-health-query-keys';

/**
 * Query compartida por Inicio y Mi Salud.
 *
 * `patientId` siempre proviene de B09. Nunca se obtiene desde parámetros
 * libres de ruta para evitar mezclar contextos autorizados.
 */
export function useHomeHealthDashboard(
  patientId: number | null,
) {
  return useQuery({
    queryKey:
      patientId !== null
        ? homeHealthQueryKeys.dashboard(patientId)
        : ['patient', 'home-dashboard', 'unresolved'],

    queryFn: () => {
      if (patientId === null) {
        throw new Error('No existe un patientContext activo.');
      }

      return homeHealthService.loadDashboard(patientId);
    },

    enabled: patientId !== null,
    staleTime: 60_000,
  });
}
