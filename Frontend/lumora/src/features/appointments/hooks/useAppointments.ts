import {
  useQuery,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';

export function useAppointments(
  patientId: number | null,
) {
  return useQuery({
    queryKey:
      patientId !== null
        ? appointmentsQueryKeys.list(
            patientId,
          )
        : [
            'patient',
            'appointments',
            'unresolved',
          ],

    enabled:
      patientId !== null,

    queryFn: () => {
      if (
        patientId === null
      ) {
        throw new Error(
          'No existe un patientContext activo.',
        );
      }

      return appointmentsApi.list(
        patientId,
      );
    },

    staleTime:
      30_000,
  });
}
