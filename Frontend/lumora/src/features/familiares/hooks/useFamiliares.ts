import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { familiaresApi } from '@/features/familiares/api/familiares-api';
import type {
  NivelAcceso,
  UsuarioRelacionadoSummary,
} from '@/features/familiares/types/familiares.types';
import { filterActiveRelaciones } from '@/features/familiares/utils/filter-active-relaciones';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

const TIPOS_RELACION_STALE_TIME = 24 * 60 * 60 * 1000;

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

  const relaciones = filterActiveRelaciones(query.data ?? []);

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


/** GET /tipos-relacion -- catálogo para el selector de "+ Añadir Familiar". */
export function useTipoRelacionCatalog() {
  return useQuery({
    queryKey: ['familiares-catalogo', 'tipos-relacion'],
    queryFn: () => familiaresApi.getTiposRelacion(),
    staleTime: TIPOS_RELACION_STALE_TIME,
  });
}

/**
 * GET /reminders/usuarios/buscar?email=... -- busca a la persona a invitar.
 * Es una mutation (no una query) porque se dispara al tocar "Buscar", no
 * automáticamente al escribir.
 */
export function useBuscarUsuarioPorEmail() {
  return useMutation<UsuarioRelacionadoSummary, unknown, string>({
    mutationFn: (email: string) => familiaresApi.buscarUsuarioPorEmail(email),
  });
}

/**
 * POST /reminders/pacientes/{id}/relaciones -- crea la relación (A11:
 * "Agregar/invitar familiar"). Refresca la lista de inmediato.
 */
export function useCrearFamiliar(patientId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      usuarioRelacionadoId,
      tipoRelacionId,
    }: {
      usuarioRelacionadoId: number;
      tipoRelacionId: number;
    }) =>
      familiaresApi.crearRelacion(patientId as number, {
        paciente_id: patientId as number,
        usuario_relacionado_id: usuarioRelacionadoId,
        tipo_relacion_id: tipoRelacionId,
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
