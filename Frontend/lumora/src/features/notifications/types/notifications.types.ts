/**
 * Tipos de la feature de Notificaciones (A09).
 *
 * Reflejan literalmente el schema Pydantic del backend
 * (Backend/src/lumora_api/schemas/reminders.py::NotificacionResponse).
 * El "tipo" ya viene calculado por el backend a partir del Recordatorio
 * de origen -- el frontend nunca lo infiere ni inventa texto (ver
 * checklist "No inventar diagnóstico/recomendaciones en frontend").
 */

export type NotificationTipo = 'alerta' | 'recordatorio' | 'cita' | 'sistema';

export type NotificationResponse = {
  id: number;
  usuario_id: number;
  recordatorio_id: number | null;
  titulo: string;
  mensaje: string;
  canal: string;
  tipo: NotificationTipo;
  enviado: boolean;
  fecha_envio: string | null;
  leido: boolean;
  fecha_lectura: string | null;
  creado_en: string;
};
