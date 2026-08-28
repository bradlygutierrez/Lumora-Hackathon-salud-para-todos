import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import type {
  HealthMetric,
} from '@/features/home-health/types/home-health.types';

type HealthMetricTileProps = {
  metric: HealthMetric;
  onPress?: () => void;
};

/** Tarjeta compacta de indicador basada en los grids del Figma B10. */
export function HealthMetricTile({
  metric,
  onPress,
}: HealthMetricTileProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="min-h-[112px] flex-1 rounded-2xl border border-coal-500/10 bg-white p-3 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Ionicons
          name={metric.hasAlert ? 'warning-outline' : 'heart-outline'}
          size={15}
          color={metric.hasAlert ? '#BF3838' : '#7B848B'}
        />

        {metric.hasAlert ? (
          <Text className="text-[10px] font-semibold text-[#BF3838]">Alerta</Text>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        className="mt-3 text-xs text-coal-500"
      >
        {metric.name}
      </Text>

      <View className="mt-1 flex-row items-end gap-1">
        <Text
          className={`text-xl font-bold ${
            metric.hasAlert ? 'text-[#BF3838]' : 'text-coal-900'
          }`}
        >
          {metric.value}
        </Text>

        {metric.unit ? (
          <Text className="pb-0.5 text-[10px] text-coal-500">
            {metric.unit}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
