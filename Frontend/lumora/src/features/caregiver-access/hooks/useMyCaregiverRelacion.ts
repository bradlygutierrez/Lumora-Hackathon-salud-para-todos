import { useQuery } from '@tanstack/react-query';

import { familiaresApi } from '@/features/familiares/api/familiares-api';
import type { RelacionPacienteResponse } from '@/features/familiares/types/familiares.types';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

/**
 * A13 -- Encuentra, dentro de la lista de relaciones del paciente activo,
 * cuál es la propia relación del cuidador autenticado.
 *
 * Reutiliza el mismo endpoint y la misma query key que "Familiares
 * Autorizados" (A11) -- no existe un endpoint dedicado a "mi propia
 * relación", así que se pide la lista completa y se filtra en el
 * cliente. Como usa la misma queryKey, comparte caché con cualquier
 * otra pantalla que ya haya pedido esta lista.
 */
export function useMyCaregiverRelacion(
  patientId: number | null,
  currentUserId: number | null,
) {
  const query = useQuery({
    queryKey:
      patientId !== null
        ? patientQueryKeys.familiares(patientId)
        : ['familiares', 'sin-paciente'],
    queryFn: () => familiaresApi.getRelaciones(patientId as number),
    enabled: patientId !== null,
  });

  const relacion: RelacionPacienteResponse | null =
    currentUserId !== null
      ? (query.data ?? []).find(
          (item) => item.usuario_relacionado_id === currentUserId,
        ) ?? null
      : null;

  return { ...query, relacion };
}
