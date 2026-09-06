import {
  useQuery,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';

export function useAvailability(
  professionalId: number | null,
  date: string | null,
) {
  return useQuery({
    queryKey:
      professionalId !== null &&
      date !== null
        ? appointmentsQueryKeys.availability(
            professionalId,
            date,
          )
        : [
            ...appointmentsQueryKeys
              .availabilityRoot,
            'unresolved',
          ],

    enabled:
      professionalId !== null &&
      date !== null,

    queryFn: () => {
      if (
        professionalId === null ||
        date === null
      ) {
        throw new Error(
          'Selecciona un profesional y una fecha.',
        );
      }

      return appointmentsApi.availability(
        professionalId,
        date,
      );
    },

    staleTime: 0,
  });
}
