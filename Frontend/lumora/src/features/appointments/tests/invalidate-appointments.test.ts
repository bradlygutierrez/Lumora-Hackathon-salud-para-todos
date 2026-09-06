import type {
  QueryClient,
} from '@tanstack/react-query';

import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';
import {
  invalidateAppointmentCaches,
} from '@/features/appointments/query/invalidate-appointments';
import {
  homeHealthQueryKeys,
} from '@/features/home-health/query/home-health-query-keys';

describe(
  'invalidateAppointmentCaches',
  () => {
    it(
      'invalida listado/detalle, disponibilidad y dashboard del paciente',
      async () => {
        const invalidateQueries =
          jest
            .fn()
            .mockResolvedValue(
              undefined,
            );

        const queryClient =
          {
            invalidateQueries,
          } as unknown as QueryClient;

        await invalidateAppointmentCaches(
          queryClient,
          15,
        );

        expect(
          invalidateQueries,
        ).toHaveBeenCalledWith({
          queryKey:
            appointmentsQueryKeys.patient(
              15,
            ),
        });

        expect(
          invalidateQueries,
        ).toHaveBeenCalledWith({
          queryKey:
            appointmentsQueryKeys
              .availabilityRoot,
        });

        expect(
          invalidateQueries,
        ).toHaveBeenCalledWith({
          queryKey:
            homeHealthQueryKeys.dashboard(
              15,
            ),
        });
      },
    );
  },
);
