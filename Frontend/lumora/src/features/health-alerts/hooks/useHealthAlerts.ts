import { useQuery } from '@tanstack/react-query';

import { healthAlertsApi } from '@/features/health-alerts/api/health-alerts-api';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

/**
 * GET .../health-alerts/patients/{paciente_id} para el paciente activo
 * (patientContext del shell, igual que Indicadores de Salud -- ver
 * features/health-indicators/hooks/usePatientId.ts). Sirve tanto para
 * Paciente como para Cuidador autorizado: el backend ya valida el acceso
 * con PatientAccessService (ver Backend/.../api/v1/health_alerts.py).
 *
 * El backend ya devuelve la lista en el orden de prioridad correcto, asi
 * que este hook no reordena nada.
 */
export function useHealthAlerts() {
  const { status, activePatient } = useShellContext();
  const pacienteId = activePatient?.patientId;

  const query = useQuery({
    queryKey: ['health-alerts', pacienteId],
    queryFn: () => healthAlertsApi.getPatientAlerts(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const isPatientLoading = status === 'idle' || status === 'loading';

  return {
    alerts: query.data ?? [],
    isLoading: isPatientLoading || query.isLoading,
    isError: status === 'error' || query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
