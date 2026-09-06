import { useQuery } from '@tanstack/react-query';

import { remindersApi } from '@/features/reminders/api/reminders-api';
import { useReminderTypeCatalog } from '@/features/reminders/hooks/useReminderTypeCatalog';
import type { RecordatorioResponse } from '@/features/reminders/types/reminders.types';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

/**
 * Recordatorios de "Seguimiento" (Beber Agua, Vitamina D, etc.) del
 * patientContext activo -- incluye los ya marcados como hechos
 * (`activo: false`), porque "Rutina simple" ya NO desaparece del
 * tablero al completarse (ver ReminderCard/GoalCompleteBadge): se
 * queda visible marcado como "Completado" en vez de desaparecer.
 *
 * GET /recordatorios/paciente/{id} devuelve TODOS los recordatorios del
 * paciente (incluyendo los de dosis/citas que ya generó A09 para las
 * notificaciones) -- acá se filtra en el cliente por tipo, exactamente
 * igual a como `useTodayMedicationPlan` filtra recetas "Activa" en vez
 * de pedirle al backend un endpoint aparte.
 */
export function useSeguimientoReminders() {
  const { activePatient } = useShellContext();
  const pacienteId = activePatient?.patientId;

  const tipoCatalog = useReminderTypeCatalog();
  const seguimientoTipoId = tipoCatalog.idByName('Seguimiento');

  const query = useQuery({
    queryKey:
      pacienteId !== undefined
        ? patientQueryKeys.reminders(pacienteId)
        : (['patient', 'reminders', 'unresolved'] as const),
    queryFn: () => remindersApi.getPatientReminders(pacienteId as number),
    enabled: pacienteId !== undefined,
  });

  const items: RecordatorioResponse[] = (query.data ?? []).filter(
    (recordatorio) =>
      seguimientoTipoId !== undefined &&
      recordatorio.tipo_recordatorio_id === seguimientoTipoId,
  );

  return {
    items,
    isLoading: query.isLoading || tipoCatalog.isLoading,
    isError: query.isError || tipoCatalog.isError,
    refetch: query.refetch,
  };
}
