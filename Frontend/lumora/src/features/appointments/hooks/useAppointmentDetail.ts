import {
  useQuery,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';

export function useAppointmentDetail(
  patientId: number | null,
  appointmentId: number | null,
) {
  return useQuery({
    queryKey:
      patientId !== null &&
      appointmentId !== null
        ? appointmentsQueryKeys.detail(
            patientId,
            appointmentId,
          )
        : [
            'patient',
            'appointments',
            'detail',
            'unresolved',
          ],

    enabled:
      patientId !== null &&
      appointmentId !== null,

    queryFn: () => {
      if (
        patientId === null ||
        appointmentId === null
      ) {
        throw new Error(
          'No existe un contexto válido para consultar la cita.',
        );
      }

      return appointmentsApi.detail(
        appointmentId,
      );
    },

    staleTime:
      15_000,
  });
}
