import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { usePatientContextStore } from '@/features/shell/store/patient-context-store';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

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

      if (
        currentPatientId !== null &&
        currentPatientId !== patientId
      ) {
        queryClient.removeQueries({
          queryKey: patientQueryKeys.all,
        });
      }

      return true;
    },
    [queryClient],
  );

  return {
    ...state,
    switchPatient,
  };
}
