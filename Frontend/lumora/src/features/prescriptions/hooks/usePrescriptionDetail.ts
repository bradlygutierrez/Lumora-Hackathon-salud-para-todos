import { useQuery } from '@tanstack/react-query';

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';
import {
  useAdministrationRouteCatalog,
  useMeasurementUnitCatalog,
  useMedicationsCatalog,
  usePrescriptionStatusCatalog,
} from '@/features/prescriptions/hooks/useCatalog';

export type ResolvedPrescriptionDetail = {
  id: string;
  medicamentoNombre: string;
  dosis: string;
  frecuencia: string;
  unidadMedidaNombre: string;
  viaAdministracionNombre: string;
  instrucciones: string | null;
};

/**
 * GET /prescriptions/{recetaId} + resolución de nombres de catálogo.
 *
 * `RecetaResponse.detalles` solo trae IDs (medicamento_id,
 * unidad_medida_id, via_administracion_id); este hook los traduce a texto
 * legible usando los catálogos ya existentes, sin tocar el backend.
 */
export function usePrescriptionDetail(recetaId: string) {
  const prescriptionQuery = useQuery({
    queryKey: ['prescription', recetaId],
    queryFn: () => prescriptionsApi.getPrescription(recetaId),
  });

  const statusCatalog = usePrescriptionStatusCatalog();
  const medicationsCatalog = useMedicationsCatalog();
  const unitsCatalog = useMeasurementUnitCatalog();
  const routesCatalog = useAdministrationRouteCatalog();

  const receta = prescriptionQuery.data;

  const detalles: ResolvedPrescriptionDetail[] = (receta?.detalles ?? []).map(
    (detalle) => ({
      id: detalle.id,
      medicamentoNombre: medicationsCatalog.nameById(detalle.medicamento_id),
      dosis: detalle.dosis,
      frecuencia: detalle.frecuencia,
      unidadMedidaNombre: unitsCatalog.nameById(detalle.unidad_medida_id),
      viaAdministracionNombre: routesCatalog.nameById(detalle.via_administracion_id),
      instrucciones: detalle.instrucciones,
    }),
  );

  // El backend no diferencia "Dr." de "Dra."; el mockup de Figma siempre
  // muestra "Dr.", así que se usa como texto fijo hasta que exista un
  // campo de género/tratamiento en el perfil del profesional.
  const doctorNombre = receta
    ? `Dr. ${receta.profesional.persona.nombres} ${receta.profesional.persona.apellidos}`
    : '';

  const isLoading =
    prescriptionQuery.isLoading ||
    statusCatalog.isLoading ||
    medicationsCatalog.isLoading ||
    unitsCatalog.isLoading ||
    routesCatalog.isLoading;

  const isError =
    prescriptionQuery.isError ||
    statusCatalog.isError ||
    medicationsCatalog.isError ||
    unitsCatalog.isError ||
    routesCatalog.isError;

  return {
    receta,
    detalles,
    doctorNombre,
    especialidad: receta?.profesional.especialidad ?? '',
    estadoNombre: receta ? statusCatalog.nameById(receta.estado_id) : '',
    isLoading,
    isError,
    refetch: prescriptionQuery.refetch,
  };
}
