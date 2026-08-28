import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import type {
  NextDose,
} from '@/features/home-health/types/home-health.types';

import {
  homeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

type NextDoseCardProps = {
  dose: NextDose;
  compact?: boolean;
  actionLabel?: string;
  onPress?: () => void;
};

/** Próxima toma. Tiene una variante hero para Inicio paciente. */
export function NextDoseCard({
  dose,
  compact = false,
  actionLabel = 'Ver medicación',
  onPress,
}: NextDoseCardProps) {
  const timing = homeHealthPresenter.doseTimingLabel(dose);

  return (
    <View
      className={`rounded-3xl border border-coal-500/10 bg-white ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-[#DCECF6]">
            <Ionicons name="medical-outline" size={16} color="#4A86B6" />
          </View>
          <Text className="text-xs font-semibold text-coal-500">Próxima dosis</Text>
        </View>

        <View className="rounded-full bg-[#DCECF6] px-3 py-1.5">
          <Text className="text-[10px] font-semibold text-[#4A86B6]">
            {timing}
          </Text>
        </View>
      </View>

      <Text
        className={`${compact ? 'mt-4 text-lg' : 'mt-4 text-3xl'} font-bold text-coal-900`}
      >
        {dose.medicationName} {dose.dose}
      </Text>

      <Text className="mt-1 text-sm text-coal-500">
        {homeHealthPresenter.formatTime(dose.scheduledAt)}
        {dose.instructions ? ` · ${dose.instructions}` : ''}
      </Text>

      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          className={`mt-5 rounded-2xl px-4 py-3 active:opacity-80 ${
            compact ? 'border border-[#DCECF6] bg-white' : 'bg-[#78AEDD]'
          }`}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              compact ? 'text-[#4A86B6]' : 'text-white'
            }`}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
