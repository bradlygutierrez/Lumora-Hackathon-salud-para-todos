import { httpClient } from '@/shared/api/http-client';

import type { HealthAlertResponse } from '@/features/health-alerts/types/health-alerts.types';

/**
 * Servicio HTTP de Alertas de Salud (A09).
 *
 * Todas las requests pasan por `httpClient`, que ya agrega el Bearer token
 * y maneja el refresh de sesion (ver shared/api/http-client.ts).
 */
export class HealthAlertsApiService {
  /**
   * GET /health-alerts/patients/{paciente_id}
   *
   * Lista unificada ya ordenada por prioridad (alta_severidad, luego
   * preventiva, luego recordatorio) -- ver
   * Backend/.../services/health_alerts_service.py::get_health_alerts.
   */
  public getPatientAlerts(pacienteId: number): Promise<HealthAlertResponse[]> {
    return httpClient.get(`/health-alerts/patients/${pacienteId}`);
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const healthAlertsApi = new HealthAlertsApiService();
