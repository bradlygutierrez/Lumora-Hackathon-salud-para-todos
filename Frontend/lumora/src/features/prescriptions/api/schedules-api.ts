import { httpClient } from '@/shared/api/http-client';

import type {
  DosisAdministradaCreate,
  DosisAdministradaResponse,
  HorarioMedicamentoResponse,
} from '@/features/prescriptions/types/prescriptions.types';

/**
 * Servicio HTTP de Horarios y Dosis (A07).
 *
 * `responsable_id` nunca se manda desde aquí: el backend siempre lo
 * sobreescribe con el usuario autenticado (ver
 * Backend/src/lumora_api/api/v1/schedules.py::create_dosis_log), así que
 * el tipo de request expuesto al resto de la feature no lo incluye.
 */
export class SchedulesApiService {
  /** GET /recetas/{detalle_receta_id}/horarios */
  public getHorarios(
    detalleRecetaId: string,
  ): Promise<HorarioMedicamentoResponse[]> {
    return httpClient.get(`/recetas/${detalleRecetaId}/horarios`);
  }

  /** GET /horarios/{horario_id}/dosis */
  public getDosisLogs(horarioId: string): Promise<DosisAdministradaResponse[]> {
    return httpClient.get(`/horarios/${horarioId}/dosis`);
  }

  /** POST /horarios/{horario_id}/dosis */
  public registerDose(
    horarioId: string,
    data: DosisAdministradaCreate,
  ): Promise<DosisAdministradaResponse> {
    return httpClient.post(`/horarios/${horarioId}/dosis`, data);
  }

  /**
   * PATCH /dosis/{dosis_id}
   *
   * `estado_dosis_id` viaja como query param (así lo espera el backend,
   * ver schedules.py::update_dosis_log) y no en el body.
   */
  public updateDosisLog(
    dosisId: string,
    estadoDosisId: number,
  ): Promise<DosisAdministradaResponse> {
    return httpClient.patch(`/dosis/${dosisId}`, undefined, {
      params: { estado_dosis_id: estadoDosisId },
    });
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const schedulesApi = new SchedulesApiService();
