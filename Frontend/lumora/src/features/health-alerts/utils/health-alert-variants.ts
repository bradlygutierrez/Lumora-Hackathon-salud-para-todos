import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

import type {
  HealthAlertCategoria,
  HealthAlertResponse,
} from '@/features/health-alerts/types/health-alerts.types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Variantes visuales por categoria de alerta (misma jerarquia que el
 * Figma: alta_severidad > preventiva > recordatorio).
 *
 * La paleta de Lumora NO tiene rojo (ver shared/theme/tokens.ts): la
 * prioridad de cada alerta se comunica con texto + icono, nunca solo con
 * color -- mismo criterio que RangeBadge en health-indicators.
 */
export const HEALTH_ALERT_CATEGORY_VARIANTS: Record<
  HealthAlertCategoria,
  { label: string; icon: IconName; bgClass: string }
> = {
  alta_severidad: {
    label: 'Alta prioridad',
    icon: 'alert-circle',
    bgClass: 'bg-warm-300',
  },
  preventiva: {
    label: 'Preventiva',
    icon: 'time-outline',
    bgClass: 'bg-lumen-300',
  },
  recordatorio: {
    label: 'Recordatorio',
    icon: 'calendar-outline',
    bgClass: 'bg-bone-500',
  },
};

/**
 * Etiqueta y destino del boton de accion segun el tipo de alerta.
 *
 * Ninguna de estas alertas trae un endpoint propio de detalle (son
 * calculadas, no filas reales -- ver
 * Backend/.../schemas/health_alerts.py), asi que el boton lleva al tab
 * donde el paciente puede actuar sobre el origen real del dato: Mi salud
 * para una alerta clinica, Medicacion para registrar una dosis, Citas
 * para ver la cita. Mismo patron que las "Acciones rapidas" de Inicio.
 */
export function actionForAlert(alert: HealthAlertResponse): {
  label: string;
  href: Href;
} {
  switch (alert.tipo) {
    case 'alerta_clinica':
      return { label: 'Ver Mi Salud', href: '/(app)/(tabs)/health' };
    case 'dosis_omitida':
      return { label: 'Registrar Ahora', href: '/(app)/(tabs)/medication' };
    case 'cita_proxima':
      return { label: 'Ver Cita', href: '/(app)/(tabs)/appointments' };
    default:
      return { label: 'Ver Mas', href: '/(app)/(tabs)' };
  }
}
