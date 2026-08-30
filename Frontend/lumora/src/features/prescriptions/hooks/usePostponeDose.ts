import { useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import {
  useDoseStatusCatalog,
  useRecordOriginCatalog,
} from '@/features/prescriptions/hooks/useCatalog';
import { todayAtHora } from '@/features/prescriptions/utils/time-of-day';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

type PostponeDoseInput = {
  horarioId: string;
  /** "HH:MM:SS" del horario, para construir `fecha_programada` de hoy. */
  hora: string;
};

/**
 * POST /horarios/{horario_id}/dosis con estado "Pospuesta" (A10).
 *
 * El catálogo `estados_dosis` ya incluye "Pospuesta" (ver
 * Backend/.../db/seed.py) aunque "Plan de Hoy" (A07) nunca lo usó -- acá
 * sí hace falta para el checklist "Acción posponer si está soportada por
 * backend" de Recordatorios.
 */
export function usePostponeDose() {
  const queryClient = useQueryClient();
  const doseStatusCatalog = useDoseStatusCatalog();
  const recordOriginCatalog = useRecordOriginCatalog();
  const { activePatient } = useShellContext();

  const pospuestaId = doseStatusCatalog.idByName('Pospuesta');
  const manualId = recordOriginCatalog.idByName('Manual');

  return useMutation({
    mutationFn: ({ horarioId, hora }: PostponeDoseInput) => {
      if (pospuestaId === undefined || manualId === undefined) {
        throw new Error(
          'No se pudieron cargar los catálogos de dosis. Intenta de nuevo.',
        );
      }

      return schedulesApi.registerDose(horarioId, {
        estado_dosis_id: pospuestaId,
        origen_registro_id: manualId,
        fecha_programada: todayAtHora(hora).toISOString(),
      });
    },
    onSuccess: () => {
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.medication(activePatient.patientId),
        });
      }
    },
  });
}
