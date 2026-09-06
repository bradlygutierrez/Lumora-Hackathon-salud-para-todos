import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { IndicatorWithRange } from '@/features/health-indicators/types/health-indicators.types';
import { iconForIndicador } from '@/features/health-indicators/utils/indicator-icon';
import { theme } from '@/shared/theme/tokens';

type IndicatorListItemProps = {
  indicador: IndicatorWithRange;
  onPress: (indicador: IndicatorWithRange) => void;
};

/** Fila de la pantalla "Seleccionar Indicador". */
export function IndicatorListItem({ indicador, onPress }: IndicatorListItemProps) {
  return (
    <Pressable
      onPress={() => onPress(indicador)}
      accessibilityRole="button"
      accessibilityLabel={indicador.nombre}
      className="flex-row items-center gap-3 rounded-2xl border border-bone-500 bg-bone-300 p-4 active:opacity-75"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-lumen-300">
        <Ionicons
          name={iconForIndicador(indicador.codigo)}
          size={22}
          color={theme.colors.textPrimary}
        />
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-coal-900">
          {indicador.nombre}
        </Text>

        {indicador.descripcion ? (
          <Text className="text-sm text-coal-500" numberOfLines={2}>
            {indicador.descripcion}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );
}
