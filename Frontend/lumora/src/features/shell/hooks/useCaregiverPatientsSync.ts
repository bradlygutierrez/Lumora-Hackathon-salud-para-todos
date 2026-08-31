import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { shellContextService } from '@/features/shell/api/ShellContextService';
import { usePatientContextStore } from '@/features/shell/store/patient-context-store';

const CAREGIVER_PATIENTS_QUERY_KEY = ['shell', 'caregiver-patients'] as const;

/** Cada cuánto se revalida la lista de pacientes autorizados de un caregiver. */
const REVALIDATE_INTERVAL_MS = 60_000;

/**
 * Mantiene al día la lista de pacientes autorizados de un caregiver
 * mientras la app está abierta (A12).
 *
 * El bootstrap inicial (ShellBootstrap) solo resuelve el contexto UNA
 * vez, al iniciar sesión -- si el paciente revoca el acceso del
 * caregiver a mitad de sesión, ese primer snapshot queda obsoleto y
 * nada lo vuelve a validar. Este hook revalida periódicamente (y al
 * volver a poner la app en primer plano) y, si el paciente activo ya
 * no aparece en la lista fresca, limpia el contexto -- el guard de
 * `_layout.tsx` ya redirige automáticamente a /select-patient en
 * cuanto el status vuelve a "needs-patient".
 */
export function useCaregiverPatientsSync() {
  const role = usePatientContextStore((state) => state.role);
  const status = usePatientContextStore((state) => state.status);

  const isCaregiverReady =
    role === 'caregiver' && status !== 'idle' && status !== 'loading';

  const query = useQuery({
    queryKey: CAREGIVER_PATIENTS_QUERY_KEY,
    queryFn: () => shellContextService.caregiverPatientContexts(),
    enabled: isCaregiverReady,
    refetchInterval: isCaregiverReady ? REVALIDATE_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isCaregiverReady || query.data === undefined) {
      return;
    }

    usePatientContextStore.getState().syncAvailablePatients('caregiver', query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCaregiverReady, query.data]);
}
