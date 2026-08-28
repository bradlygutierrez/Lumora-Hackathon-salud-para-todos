import { useMutation, useQueryClient } from '@tanstack/react-query';

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';
import { usePatientId } from '@/features/health-indicators/hooks/usePatientId';
import { useRecordOriginCatalog } from '@/features/prescriptions/hooks/useCatalog';
import type { MedicionIndicadorCreate } from '@/features/health-indicators/types/health-indicators.types';

export type RegisterMeasurementInput = {
  indicadorId: string;
  valor: number;
  unidadMedidaId: number;
  /** Reutiliza el mismo catálogo `origenes_registro` que ya usan las dosis (A07). */
  origen: 'Manual' | 'Dispositivo';
  observaciones?: string | null;
};

/**
 * POST /health-indicators/patients/{paciente_id}/measurements
 *
 * `registrado_por_id` nunca se manda desde aquí: el backend siempre lo
 * fuerza al usuario autenticado (ver
 * Backend/.../api/v1/health_indicators.py::registrar_medicion).
 */
export function useRegisterMeasurement() {
  const queryClient = useQueryClient();
  const { pacienteId } = usePatientId();
  const originCatalog = useRecordOriginCatalog();

  return useMutation({
    mutationFn: ({
      indicadorId,
      valor,
      unidadMedidaId,
      origen,
      observaciones,
    }: RegisterMeasurementInput) => {
      const origenId = originCatalog.idByName(origen);

      if (pacienteId === undefined || origenId === undefined) {
        throw new Error(
          'No se pudo resolver el paciente o el origen del registro. Intenta de nuevo.',
        );
      }

      const data: MedicionIndicadorCreate = {
        indicador_id: indicadorId,
        valor,
        unidad_medida_id: unidadMedidaId,
        origen_registro_id: origenId,
        observaciones: observaciones ?? null,
      };

      return healthIndicatorsApi.registerMeasurement(pacienteId, data);
    },
    onSuccess: () => {
      // Refresca historial y alertas de ESTE indicador para que "Historial
      // de Indicador" muestre la medición recién registrada y lo que haya
      // evaluado FastAPI de inmediato.
      void queryClient.invalidateQueries({
        queryKey: ['health-indicator-measurements', pacienteId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['health-indicator-alerts', pacienteId],
      });
    },
  });
}
