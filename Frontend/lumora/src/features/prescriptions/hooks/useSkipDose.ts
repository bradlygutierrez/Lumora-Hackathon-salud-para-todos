import { useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import {
  useDoseStatusCatalog,
  useRecordOriginCatalog,
} from '@/features/prescriptions/hooks/useCatalog';
import { todayAtHora } from '@/features/prescriptions/utils/time-of-day';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

type SkipDoseInput = {
  horarioId: string;
  /** "HH:MM:SS" del horario, para construir `fecha_programada` de hoy. */
  hora: string;
};

/**
 * POST /horarios/{horario_id}/dosis con estado "Omitida" (A10).
 *
 * Mismo mecanismo que `useRegisterDose`, pero registra que la dosis de
 * hoy se saltó a propósito en vez de tomarse. Usado desde la pantalla de
 * Recordatorios -- "Plan de Hoy" (A07) no lo necesita porque ahí "no
 * tomarla" simplemente se deja pendiente.
 */
export function useSkipDose() {
  const queryClient = useQueryClient();
  const doseStatusCatalog = useDoseStatusCatalog();
  const recordOriginCatalog = useRecordOriginCatalog();
  const { activePatient } = useShellContext();

  const omitidaId = doseStatusCatalog.idByName('Omitida');
  const manualId = recordOriginCatalog.idByName('Manual');

  return useMutation({
    mutationFn: ({ horarioId, hora }: SkipDoseInput) => {
      if (omitidaId === undefined || manualId === undefined) {
        throw new Error(
          'No se pudieron cargar los catálogos de dosis. Intenta de nuevo.',
        );
      }

      return schedulesApi.registerDose(horarioId, {
        estado_dosis_id: omitidaId,
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
