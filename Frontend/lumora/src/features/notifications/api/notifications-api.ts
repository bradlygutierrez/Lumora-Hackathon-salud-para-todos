import { httpClient } from '@/shared/api/http-client';

import type { NotificationResponse } from '@/features/notifications/types/notifications.types';

/**
 * Servicio HTTP de Notificaciones (A09).
 *
 * Backend ya construido (A04-A05) -- ver
 * Backend/.../api/v1/reminders.py. Todas las requests pasan por
 * `httpClient`, que ya agrega el Bearer token y maneja el refresh de
 * sesion (ver shared/api/http-client.ts).
 */
export class NotificationsApiService {
  /**
   * GET /reminders/notificaciones/paciente/{paciente_id}
   *
   * El backend resuelve el paciente activo al usuario dueño de las
   * notificaciones -- funciona igual para Paciente y para Cuidador
   * autorizado (ver PatientAccessService en el backend).
   */
  public getPatientNotifications(pacienteId: number): Promise<NotificationResponse[]> {
    return httpClient.get(`/reminders/notificaciones/paciente/${pacienteId}`);
  }

  /**
   * PATCH /reminders/notificaciones/{id}/marcar-leida
   */
  public markAsRead(id: number): Promise<NotificationResponse> {
    return httpClient.patch(`/reminders/notificaciones/${id}/marcar-leida`);
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const notificationsApi = new NotificationsApiService();
