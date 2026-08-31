import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { familiaresApi } from '@/features/familiares/api/familiares-api';
import type {
  NivelAcceso,
  RelacionPacienteResponse,
} from '@/features/familiares/types/familiares.types';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

/**
 * GET /pacientes/{id}/relaciones (A11).
 *
 * Solo se muestran relaciones activas -- una revocada ya no debe
 * aparecer en "Familiares Autorizados".
 */
export function useFamiliares(patientId: number | null) {
  const query = useQuery({
    queryKey: patientId !== null ? patientQueryKeys.familiares(patientId) : ['familiares', 'sin-paciente'],
    queryFn: () => familiaresApi.getRelaciones(patientId as number),
    enabled: patientId !== null,
  });

  const relaciones: RelacionPacienteResponse[] = (query.data ?? []).filter(
    (item) => item.activo && item.estado === 'active',
  );

  return { ...query, relaciones };
}

/**
 * Activa/desactiva permisos de una relación (recibir_notificaciones y/o
 * nivel_acceso). Refresca la lista de inmediato tras el cambio.
 */
export function useUpdateFamiliarPermiso(patientId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      relacionId,
      recibirNotificaciones,
      nivelAcceso,
    }: {
      relacionId: number;
      recibirNotificaciones?: boolean;
      nivelAcceso?: NivelAcceso;
    }) =>
      familiaresApi.updateRelacion(patientId as number, relacionId, {
        ...(recibirNotificaciones !== undefined && {
          recibir_notificaciones: recibirNotificaciones,
        }),
        ...(nivelAcceso !== undefined && { nivel_acceso: nivelAcceso }),
      }),
    onSuccess: () => {
      if (patientId !== null) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.familiares(patientId),
        });
      }
    },
  });
}

/** Revoca una relación (estado -> "revoked"). Requiere confirmación en la UI. */
export function useRevokeFamiliar(patientId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relacionId: number) =>
      familiaresApi.updateRelacion(patientId as number, relacionId, {
        estado: 'revoked',
      }),
    onSuccess: () => {
      if (patientId !== null) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.familiares(patientId),
        });
      }
    },
  });
}
