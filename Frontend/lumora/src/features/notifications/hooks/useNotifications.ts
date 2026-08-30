import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

/**
 * GET .../reminders/notificaciones/paciente/{paciente_id} para el
 * paciente activo (patientContext del shell, igual que Alertas de Salud
 * -- ver features/health-alerts/hooks/useHealthAlerts.ts). Sirve tanto
 * para Paciente como para Cuidador autorizado: el backend ya valida el
 * acceso con PatientAccessService (ver
 * Backend/.../api/v1/reminders.py::listar_notificaciones_paciente).
 */
export function useNotifications() {
  const { status, activePatient } = useShellContext();
  const pacienteId = activePatient?.patientId;
  const queryClient = useQueryClient();

  const queryKey = ['notifications', pacienteId];

  const query = useQuery({
    queryKey,
    queryFn: () => notificationsApi.getPatientNotifications(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const isPatientLoading = status === 'idle' || status === 'loading';
  const notifications = query.data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.leido).length,
    isLoading: isPatientLoading || query.isLoading,
    isError: status === 'error' || query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    markAsRead: (id: number) => {
      void markAsReadMutation.mutate(id);
    },
  };
}
