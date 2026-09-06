import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  listHealthIndicators,
  listMeasurementOrigins,
  listMeasurementUnits,
  listPatientMeasurements,
} from '../api/measurements.api';

export function usePatientMeasurements(patientId: number) {
  const { session } = useAuthSession();
  return useQuery({
    enabled: patientId > 0,
    queryKey: ['clinical', 'measurements', patientId],
    queryFn: () =>
      session?.isPreview ? Promise.resolve([]) : listPatientMeasurements(patientId),
    refetchInterval: session?.isPreview ? false : 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMeasurementCatalogs() {
  const { session } = useAuthSession();
  const indicators = useQuery({
    queryKey: ['clinical', 'measurement-catalogs', 'indicators'],
    queryFn: () =>
      session?.isPreview ? Promise.resolve([]) : listHealthIndicators(),
    staleTime: 30 * 60 * 1000,
  });
  const units = useQuery({
    queryKey: ['clinical', 'measurement-catalogs', 'units'],
    queryFn: () =>
      session?.isPreview
        ? Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 })
        : listMeasurementUnits(),
    staleTime: 30 * 60 * 1000,
  });
  const origins = useQuery({
    queryKey: ['clinical', 'measurement-catalogs', 'origins'],
    queryFn: () =>
      session?.isPreview
        ? Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 })
        : listMeasurementOrigins(),
    staleTime: 30 * 60 * 1000,
  });
  return { indicators, units, origins };
}
