import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import type { RangeEvaluation } from '@/features/health-indicators/types/health-indicators.types';
import { theme } from '@/shared/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type RangeBadgeProps = {
  evaluacion: RangeEvaluation;
};

/**
 * Badge de "Normal" / "Fuera de rango" / "Sin rango definido".
 *
 * La paleta de Lumora NO tiene rojo (ver shared/theme/tokens.ts): un error
 * o alerta SIEMPRE debe acompañarse de texto/icono, nunca comunicarse solo
 * por color. Este componente es el único lugar donde se decide cómo se ve
 * cada estado, para no repetir esa regla en cada pantalla.
 */
const VARIANTS: Record<
  RangeEvaluation,
  { label: string; icon: IconName; bgClass: string }
> = {
  normal: { label: 'Normal', icon: 'checkmark-circle', bgClass: 'bg-lumen-300' },
  fuera_de_rango: {
    label: 'Fuera de rango',
    icon: 'alert-circle',
    bgClass: 'bg-warm-300',
  },
  sin_rango: {
    label: 'Sin rango definido',
    icon: 'information-circle',
    bgClass: 'bg-bone-500',
  },
};

export function RangeBadge({ evaluacion }: RangeBadgeProps) {
  const variant = VARIANTS[evaluacion];

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-3 py-1 ${variant.bgClass}`}
    >
      <Ionicons name={variant.icon} size={14} color={theme.colors.textPrimary} />
      <Text className="text-xs font-semibold text-coal-900">{variant.label}</Text>
    </View>
  );
}
