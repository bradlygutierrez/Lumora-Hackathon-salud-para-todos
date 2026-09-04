import { apiClient } from '@/src/shared/api/client';
import type { NotificationResponse } from '../types/notifications.types';

// GET .../reminders/notificaciones/usuario/{usuario_id}: el backend solo
// permite consultar las notificaciones propias (current_user.id ==
// usuario_id) -- ver Backend/.../api/v1/reminders.py::listar_notificaciones.
// Es el endpoint correcto para el staff (no tiene "paciente activo" como
// la app de paciente).
export async function listMyNotifications(userId: number): Promise<NotificationResponse[]> {
  const response = await apiClient.get<NotificationResponse[]>(
    `/reminders/notificaciones/usuario/${userId}`,
  );
  return response.data;
}

export async function markNotificationAsRead(id: number): Promise<NotificationResponse> {
  const response = await apiClient.patch<NotificationResponse>(
    `/reminders/notificaciones/${id}/marcar-leida`,
  );
  return response.data;
}
