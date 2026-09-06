import {
  useQuery,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';

export function useAppointmentTypes() {
  return useQuery({
    queryKey:
      appointmentsQueryKeys
        .appointmentTypes,

    queryFn: () =>
      appointmentsApi
        .appointmentTypes(),

    select: (
      page,
    ) =>
      page.items,

    staleTime: 0,
  });
}

export function useAppointmentLocations() {
  return useQuery({
    queryKey:
      appointmentsQueryKeys
        .locations,

    queryFn: () =>
      appointmentsApi.locations(),

    staleTime: 0,
  });
}
