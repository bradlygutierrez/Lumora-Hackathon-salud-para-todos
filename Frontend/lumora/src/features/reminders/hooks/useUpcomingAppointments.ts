import { useQuery } from '@tanstack/react-query';

import { homeHealthService } from '@/features/home-health/api/HomeHealthService';
import type { AppointmentResponse } from '@/features/home-health/types/home-health.types';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

/**
 * Citas futuras del patientContext activo, para el tablero de
 * Recordatorios. Reutiliza `homeHealthService` (ya usado por la pantalla
 * "Citas", ver app/(app)/(tabs)/appointments.tsx) en vez de duplicar la
 * llamada a /citas.
 */
export function useUpcomingAppointments() {
  const { activePatient } = useShellContext();
  const pacienteId = activePatient?.patientId;

  const query = useQuery({
    queryKey:
      pacienteId !== undefined
        ? [...patientQueryKeys.appointments(pacienteId), 'reminders-board']
        : (['patient', 'appointments', 'unresolved'] as const),
    queryFn: () => homeHealthService.getAppointments(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const items: AppointmentResponse[] = query.data ?? [];

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
