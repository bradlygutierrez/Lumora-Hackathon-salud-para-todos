import { useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import {
  useDoseStatusCatalog,
  useRecordOriginCatalog,
} from '@/features/prescriptions/hooks/useCatalog';
import { todayAtHora } from '@/features/prescriptions/utils/time-of-day';

type RegisterDoseInput = {
  horarioId: string;
  /** "HH:MM:SS" del horario, para construir `fecha_programada` de hoy. */
  hora: string;
};

/**
 * POST /horarios/{horario_id}/dosis
 *
 * Marca como tomada la dosis programada de HOY para un horario. El
 * backend siempre fuerza `responsable_id` al usuario autenticado (ver
 * Backend/.../api/v1/schedules.py::create_dosis_log), así que este hook
 * nunca lo manda.
 *
 * Se llama una sola vez a nivel de pantalla (no por tarjeta) para respetar
 * las Rules of Hooks; qué horario está en curso se sabe por
 * `mutation.variables` (ver MedicationRoute).
 */
export function useRegisterDose() {
  const queryClient = useQueryClient();
  const doseStatusCatalog = useDoseStatusCatalog();
  const recordOriginCatalog = useRecordOriginCatalog();

  const tomadaId = doseStatusCatalog.idByName('Tomada');
  const manualId = recordOriginCatalog.idByName('Manual');

  return useMutation({
    mutationFn: ({ horarioId, hora }: RegisterDoseInput) => {
      if (tomadaId === undefined || manualId === undefined) {
        throw new Error(
          'No se pudieron cargar los catálogos de dosis. Intenta de nuevo.',
        );
      }

      return schedulesApi.registerDose(horarioId, {
        estado_dosis_id: tomadaId,
        origen_registro_id: manualId,
        fecha_programada: todayAtHora(hora).toISOString(),
      });
    },
    onSuccess: (_data, variables) => {
      // Refresca el log de dosis de este horario para que el "Plan de
      // Hoy" recalcule el estado (Pendiente -> Tomada) y el contador.
      void queryClient.invalidateQueries({
        queryKey: ['dosis-logs', variables.horarioId],
      });
    },
  });
}
