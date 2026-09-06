import { useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulesApi } from '@/features/prescriptions/api/schedules-api';
import { useDoseStatusCatalog } from '@/features/prescriptions/hooks/useCatalog';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

type CancelDoseInput = {
  dosisId: string;
  horarioId: string;
};

/**
 * PATCH /dosis/{dosis_id} -> vuelve el estado a "Pendiente".
 *
 * Deshace un "Registrar dosis": el registro no se borra, solo cambia de
 * estado, así que "Plan de Hoy" lo vuelve a mostrar como pendiente. Igual
 * que `useRegisterDose`, se llama una sola vez a nivel de pantalla.
 */
export function useCancelDose() {
  const queryClient = useQueryClient();
  const doseStatusCatalog = useDoseStatusCatalog();
  const { activePatient } = useShellContext();

  const pendienteId = doseStatusCatalog.idByName('Pendiente');

  return useMutation({
    mutationFn: ({ dosisId }: CancelDoseInput) => {
      if (pendienteId === undefined) {
        throw new Error(
          'No se pudo cargar el catálogo de dosis. Intenta de nuevo.',
        );
      }

      return schedulesApi.updateDosisLog(dosisId, pendienteId);
    },
    onSuccess: () => {
      // Mismo fix que useRegisterDose: invalidar el prefijo real de
      // medicación de este paciente, no una clave que nunca matcheaba.
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.medication(activePatient.patientId),
        });
      }
    },
  });
}
