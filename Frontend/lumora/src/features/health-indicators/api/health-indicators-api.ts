import { httpClient } from '@/shared/api/http-client';

import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorCreate,
  MedicionIndicadorResponse,
  RangoIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

/**
 * Servicio HTTP de Indicadores de Salud (A08).
 *
 * Todas las requests pasan por `httpClient`, que ya agrega el Bearer token
 * y maneja el refresh de sesión (ver shared/api/http-client.ts).
 */
export class HealthIndicatorsApiService {
  /** GET /health-indicators/indicators */
  public getIndicators(): Promise<IndicadorMedicoResponse[]> {
    return httpClient.get('/health-indicators/indicators', {
      params: { active_only: true },
    });
  }

  /** GET /health-indicators/indicators/{indicador_id}/ranges */
  public getIndicatorRanges(
    indicadorId: string,
  ): Promise<RangoIndicadorResponse[]> {
    return httpClient.get(
      `/health-indicators/indicators/${indicadorId}/ranges`,
      { params: { active_only: true } },
    );
  }

  /** GET /health-indicators/patients/{paciente_id}/measurements */
  public getPatientMeasurements(
    pacienteId: number,
  ): Promise<MedicionIndicadorResponse[]> {
    return httpClient.get(
      `/health-indicators/patients/${pacienteId}/measurements`,
    );
  }

  /**
   * POST /health-indicators/patients/{paciente_id}/measurements
   *
   * `registrado_por_id` nunca se manda desde aquí: el backend siempre lo
   * sobreescribe con el usuario autenticado (ver
   * Backend/.../api/v1/health_indicators.py::registrar_medicion), así que
   * el tipo de request expuesto al resto de la feature no lo incluye.
   */
  public registerMeasurement(
    pacienteId: number,
    data: MedicionIndicadorCreate,
  ): Promise<MedicionIndicadorResponse> {
    return httpClient.post(
      `/health-indicators/patients/${pacienteId}/measurements`,
      data,
    );
  }

  /** GET /health-indicators/patients/{paciente_id}/alerts */
  public getPatientAlerts(
    pacienteId: number,
    soloPendientes = true,
  ): Promise<AlertaClinicaResponse[]> {
    return httpClient.get(`/health-indicators/patients/${pacienteId}/alerts`, {
      params: { solo_pendientes: soloPendientes },
    });
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const healthIndicatorsApi = new HealthIndicatorsApiService();
