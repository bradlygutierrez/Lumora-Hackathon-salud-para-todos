import type {
  QueryClient,
} from '@tanstack/react-query';

import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';
import {
  homeHealthQueryKeys,
} from '@/features/home-health/query/home-health-query-keys';

/**
 * Invalida tanto la feature de citas como el dashboard B10, porque crear,
 * reprogramar o cancelar una cita puede cambiar la "próxima cita" de Inicio.
 */
export async function invalidateAppointmentCaches(
  queryClient: QueryClient,
  patientId: number,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey:
        appointmentsQueryKeys.patient(
          patientId,
        ),
    }),

    queryClient.invalidateQueries({
      queryKey:
        appointmentsQueryKeys
          .availabilityRoot,
    }),

    queryClient.invalidateQueries({
      queryKey:
        homeHealthQueryKeys.dashboard(
          patientId,
        ),
    }),
  ]);
}
