import {
  useQuery,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentsQueryKeys,
} from '@/features/appointments/query/appointments-query-keys';
import type {
  ProfessionalFilters,
} from '@/features/appointments/types/appointments.types';

export function useProfessionals(
  filters: ProfessionalFilters = {},
) {
  return useQuery({
    queryKey:
      appointmentsQueryKeys.professionals(
        filters,
      ),

    queryFn: () =>
      appointmentsApi.professionals(
        filters,
      ),

    staleTime:
      60_000,
  });
}
