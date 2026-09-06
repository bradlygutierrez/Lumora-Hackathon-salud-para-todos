import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { HealthAlertResponse } from '@/features/health-alerts/types/health-alerts.types';
import {
  actionForAlert,
  HEALTH_ALERT_CATEGORY_VARIANTS,
  secondaryActionForAlert,
} from '@/features/health-alerts/utils/health-alert-variants';
import { theme } from '@/shared/theme/tokens';

/** Formatea un ISO datetime del backend como "26 ago 2026, 08:15". */
function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type HealthAlertCardProps = {
  alert: HealthAlertResponse;
  /**
   * A13 -- un cuidador de solo lectura puede ver la alerta pero no
   * accionar "Registrar Ahora" en una dosis omitida (eso es una
   * mutacion). El resto de acciones son de solo navegacion/lectura, asi
   * que se muestran siempre.
   */
  canManage: boolean;
};

/** Tarjeta de una alerta en "Alertas de Salud" (A09). */
export function HealthAlertCard({ alert, canManage }: HealthAlertCardProps) {
  const variant = HEALTH_ALERT_CATEGORY_VARIANTS[alert.categoria];
  const action = actionForAlert(alert);
  const secondaryAction = secondaryActionForAlert(alert);
  const showPrimaryAction = canManage || alert.tipo !== 'dosis_omitida';

  return (
    <View className="gap-3 rounded-2xl border border-bone-500 bg-bone-300 p-4">
      <View
        className={`flex-row items-center gap-1 self-start rounded-full px-3 py-1 ${variant.bgClass}`}
      >
        <Ionicons name={variant.icon} size={14} color={theme.colors.textPrimary} />
        <Text className="text-xs font-semibold text-coal-900">{variant.label}</Text>
      </View>

      <Text className="text-base font-semibold text-coal-900">{alert.titulo}</Text>
      <Text className="text-sm text-coal-500">{alert.mensaje}</Text>
      <Text className="text-xs text-coal-500">{formatDateTime(alert.fecha)}</Text>

      <View className="mt-1 flex-row flex-wrap items-center gap-2">
        {showPrimaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.href)}
            className="flex-row items-center justify-center gap-1 self-start rounded-full bg-lumen-500 px-4 py-2 active:opacity-75"
          >
            <Text className="text-sm font-semibold text-coal-900">{action.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}

        {secondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryAction.label}
            accessibilityState={{ disabled: secondaryAction.disabled }}
            disabled={secondaryAction.disabled}
            className="flex-row items-center justify-center gap-1 self-start rounded-full border border-bone-500 bg-bone-300 px-4 py-2 opacity-50"
          >
            <Text className="text-sm font-semibold text-coal-500">
              {secondaryAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
