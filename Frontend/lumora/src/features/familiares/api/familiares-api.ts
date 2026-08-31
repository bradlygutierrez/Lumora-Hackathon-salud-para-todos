import { httpClient } from '@/shared/api/http-client';

import type {
  RelacionPacienteCreateInput,
  RelacionPacienteResponse,
  RelacionPacienteUpdateInput,
  TipoRelacionCatalogPage,
  UsuarioRelacionadoSummary,
} from '@/features/familiares/types/familiares.types';

/**
 * Servicio HTTP de Familiares Autorizados / red de cuidado (A11).
 *
 * Todas las requests pasan por `httpClient` (Bearer token + refresh de
 * sesión automáticos, ver shared/api/http-client.ts).
 */
export class FamiliaresApiService {
  /** GET /reminders/pacientes/{paciente_id}/relaciones */
  public getRelaciones(pacienteId: number): Promise<RelacionPacienteResponse[]> {
    return httpClient.get(`/reminders/pacientes/${pacienteId}/relaciones`);
  }

  /** PATCH /reminders/pacientes/{paciente_id}/relaciones/{relacion_id} */
  public updateRelacion(
    pacienteId: number,
    relacionId: number,
    data: RelacionPacienteUpdateInput,
  ): Promise<RelacionPacienteResponse> {
    return httpClient.patch(
      `/reminders/pacientes/${pacienteId}/relaciones/${relacionId}`,
      data,
    );
  }

  /** GET /reminders/usuarios/buscar?email=... -- para "+ Añadir Familiar". */
  public buscarUsuarioPorEmail(email: string): Promise<UsuarioRelacionadoSummary> {
    return httpClient.get(`/reminders/usuarios/buscar`, { params: { email } });
  }

  /** POST /reminders/pacientes/{paciente_id}/relaciones */
  public crearRelacion(
    pacienteId: number,
    data: RelacionPacienteCreateInput,
  ): Promise<RelacionPacienteResponse> {
    return httpClient.post(`/reminders/pacientes/${pacienteId}/relaciones`, data);
  }

  /** GET /tipos-relacion?limit=100 (catálogo, sin prefijo /reminders -- propio router). */
  public getTiposRelacion(): Promise<TipoRelacionCatalogPage> {
    return httpClient.get('/tipos-relacion?limit=100');
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const familiaresApi = new FamiliaresApiService();
