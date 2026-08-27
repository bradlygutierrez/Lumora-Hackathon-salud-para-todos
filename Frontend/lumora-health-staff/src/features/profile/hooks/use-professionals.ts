import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/src/shared/api/query-keys';
import { getProfessional, listProfessionals } from '../api/professionals.api';

export function useProfessionals() {
  return useQuery({
    queryKey: queryKeys.clinical.professionals.list({ limit: 50, offset: 0 }),
    queryFn: () => listProfessionals({ limit: 50, offset: 0 }),
  });
}

export function useProfessional(professionalId: number) {
  return useQuery({
    enabled: Number.isFinite(professionalId),
    queryKey: queryKeys.clinical.professionals.detail(professionalId),
    queryFn: () => getProfessional(professionalId),
  });
}
