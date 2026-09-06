import {
  patientQueryKeys,
} from '@/features/shell/query/patient-query-keys';

/**
 * Query keys patient-scoped de B10.
 *
 * El prefijo `patientQueryKeys.all` es intencional: B09 elimina todas las
 * queries de ese namespace al cambiar de paciente cuidador, evitando que
 * la UI muestre información del contexto anterior.
 */
export const homeHealthQueryKeys = {
  dashboard: (patientId: number) =>
    [
      ...patientQueryKeys.health(patientId),
      'home-dashboard',
    ] as const,
};
