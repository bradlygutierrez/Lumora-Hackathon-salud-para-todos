import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

import type {
  NotificationResponse,
  NotificationTipo,
} from '@/features/notifications/types/notifications.types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Variantes visuales por tipo de notificacion (mismo criterio que
 * HEALTH_ALERT_CATEGORY_VARIANTS en Alertas de Salud: la paleta de
 * Lumora NO tiene rojo -- ver shared/theme/tokens.ts -- asi que "alerta"
 * usa ambar en vez del rojo del Figma).
 */
export const NOTIFICATION_TIPO_VARIANTS: Record<
  NotificationTipo,
  { icon: IconName; iconBgClass: string; accentBorderClass: string }
> = {
  alerta: {
    icon: 'pulse',
    iconBgClass: 'bg-warm-300',
    accentBorderClass: 'border-l-warm-500',
  },
  recordatorio: {
    icon: 'medkit',
    iconBgClass: 'bg-lumen-300',
    accentBorderClass: 'border-l-lumen-500',
  },
  cita: {
    icon: 'calendar-outline',
    iconBgClass: 'bg-bone-500',
    accentBorderClass: 'border-l-bone-500',
  },
  sistema: {
    icon: 'document-text-outline',
    iconBgClass: 'bg-bone-500',
    accentBorderClass: 'border-l-bone-500',
  },
};

export type NotificationAction = {
  label: string;
  variant: 'primary' | 'secondary';
  href?: Href;
  disabled?: boolean;
};

/**
 * Botones de accion por tipo de notificacion, segun el Figma.
 *
 * - alerta: "Ver Detalles" lleva al selector general de Indicadores.
 *   (En Alertas de Salud el mismo boton entra directo al historial de un
 *   indicador especifico porque el backend expone `indicador_id` en esa
 *   respuesta -- NotificacionResponse no lo trae, y agregarlo es un
 *   cambio de Backend que por ahora queda fuera de esta tarea.)
 * - recordatorio: "Marcar tomada" / "Posponer" se muestran igual que el
 *   Figma pero deshabilitados -- la pantalla de Recordatorio, donde se
 *   registraria la dosis de verdad, es otra tarea todavia sin construir.
 *   Cuando exista, estos botones dejan de estar deshabilitados.
 * - cita / sistema: sin boton de accion en el Figma.
 */
export function actionsForNotification(
  notification: NotificationResponse,
): NotificationAction[] {
  switch (notification.tipo) {
    case 'alerta':
      return [
        { label: 'Ver Detalles', variant: 'primary', href: '/(app)/health-indicators' },
      ];
    case 'recordatorio':
      return [
        { label: 'Marcar tomada', variant: 'primary', disabled: true },
        { label: 'Posponer', variant: 'secondary', disabled: true },
      ];
    default:
      return [];
  }
}
