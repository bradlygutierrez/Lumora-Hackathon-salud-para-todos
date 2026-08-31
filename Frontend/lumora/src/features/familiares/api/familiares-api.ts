import { httpClient } from '@/shared/api/http-client';

import type {
  RelacionPacienteResponse,
  RelacionPacienteUpdateInput,
} from '@/features/familiares/types/familiares.types';

/**
 * Servicio HTTP de Familiares Autorizados / red de cuidado (A11).
 *
 * Todas las requests pasan por `httpClient` (Bearer token + refresh de
 * sesión automáticos, ver shared/api/http-client.ts).
 */
export class FamiliaresApiService {
  /** GET /pacientes/{paciente_id}/relaciones */
  public getRelaciones(pacienteId: number): Promise<RelacionPacienteResponse[]> {
    return httpClient.get(`/pacientes/${pacienteId}/relaciones`);
  }

  /** PATCH /pacientes/{paciente_id}/relaciones/{relacion_id} */
  public updateRelacion(
    pacienteId: number,
    relacionId: number,
    data: RelacionPacienteUpdateInput,
  ): Promise<RelacionPacienteResponse> {
    return httpClient.patch(
      `/pacientes/${pacienteId}/relaciones/${relacionId}`,
      data,
    );
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const familiaresApi = new FamiliaresApiService();
