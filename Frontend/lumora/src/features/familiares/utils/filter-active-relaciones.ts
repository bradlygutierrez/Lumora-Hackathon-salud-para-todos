import type { RelacionPacienteResponse } from '@/features/familiares/types/familiares.types';

/**
 * Una relación solo debe aparecer en "Familiares Autorizados" cuando
 * sigue activa -- una revocada (`estado: 'revoked'`) o desactivada
 * (`activo: false`) ya no debe listarse, aunque el backend la siga
 * devolviendo (historial).
 */
export function filterActiveRelaciones(
  relaciones: RelacionPacienteResponse[],
): RelacionPacienteResponse[] {
  return relaciones.filter((item) => item.activo && item.estado === 'active');
}
