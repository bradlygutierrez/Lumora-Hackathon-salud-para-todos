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
    label: 'Alta Prioridad',
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
 * Etiqueta y destino del boton principal de accion segun el tipo de
 * alerta.
 *
 * - alerta_clinica: lleva directo al historial del indicador que causo
 *   la alerta (ej. "Presion Arterial"), usando `indicador_id` -- mismo
 *   destino que si el paciente lo seleccionara a mano desde "Seleccionar
 *   Indicador" (A08). Si por algun motivo no viniera el indicador_id, cae
 *   al selector general en vez de romper la navegacion.
 * - dosis_omitida / cita_proxima: ninguna trae un endpoint propio de
 *   detalle (son calculadas, no filas reales -- ver
 *   Backend/.../schemas/health_alerts.py), asi que el boton lleva al tab
 *   donde el paciente puede actuar sobre el origen real del dato.
 */
export function actionForAlert(alert: HealthAlertResponse): {
  label: string;
  href: Href;
} {
  switch (alert.tipo) {
    case 'alerta_clinica':
      return {
        label: 'Ver Medición Completa',
        href: alert.indicador_id
          ? {
              pathname: '/(app)/health-indicators/[indicadorId]/history',
              params: { indicadorId: alert.indicador_id },
            }
          : '/(app)/health-indicators',
      };
    case 'dosis_omitida':
      return { label: 'Registrar Ahora', href: '/(app)/(tabs)/medication' };
    case 'cita_proxima':
      return { label: 'Ver Cita', href: '/(app)/(tabs)/appointments' };
    default:
      return { label: 'Ver Mas', href: '/(app)/(tabs)' };
  }
}

/**
 * Boton secundario "Contactar Medico", solo para alertas clinicas de
 * alta severidad (ver Figma).
 *
 * Todavia no existe una pantalla de Contactos -- esa es la tarea A13
 * ("Permisos y Contactos" del Figma de Inicio/Vista Cuidador), que
 * todavia no se ha construido. Mientras tanto el boton se muestra
 * deshabilitado (igual al Figma visualmente, pero sin accion) para no
 * navegar a una pantalla que no existe. Cuando A13 este lista, este
 * boton pasa a ser un Link real hacia el contacto del profesional de la
 * receta.
 */
export function secondaryActionForAlert(
  alert: HealthAlertResponse
): { label: string; disabled: true } | null {
  if (alert.tipo !== 'alerta_clinica') return null;
  return { label: 'Contactar Médico', disabled: true };
}
