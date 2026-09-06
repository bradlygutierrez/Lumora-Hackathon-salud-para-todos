import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { shellContextService } from '@/features/shell/api/ShellContextService';
import { usePatientContextStore } from '@/features/shell/store/patient-context-store';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';
import { shouldClearPatientCache } from '@/features/shell/navigation/shell-route-guard';
import type {
  SelectableLumoraRole,
} from '@/features/shell/types/shell.types';

export function useShellContext() {
  const queryClient = useQueryClient();
  const state = usePatientContextStore();

  const switchPatient = useCallback(
    (patientId: number): boolean => {
      const currentPatientId =
        usePatientContextStore.getState().activePatient?.patientId ?? null;

      const success =
        usePatientContextStore.getState().selectPatient(patientId);

      if (!success) {
        return false;
      }

      if (shouldClearPatientCache(currentPatientId, patientId)) {
        queryClient.removeQueries({
          queryKey: patientQueryKeys.all,
        });
      }

      return true;
    },
    [queryClient],
  );

  const switchRole = useCallback(
    async (role: SelectableLumoraRole): Promise<boolean> => {
      usePatientContextStore.getState().beginLoading();

      try {
        const contexts =
          await shellContextService.contextsForRole(role);

        queryClient.removeQueries({
          queryKey: patientQueryKeys.all,
        });

        usePatientContextStore
          .getState()
          .activateRole(
            role,
            contexts,
          );

        return true;
      } catch {
        usePatientContextStore
          .getState()
          .setError(
            role === 'patient'
              ? 'No fue posible abrir tu perfil de paciente.'
              : 'No fue posible cargar tus pacientes autorizados.',
          );

        return false;
      }
    },
    [queryClient],
  );

  return {
    ...state,
    switchPatient,
    switchRole,
  };
}
