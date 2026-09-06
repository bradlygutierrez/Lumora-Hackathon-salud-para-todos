import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  ProfessionalAvatar,
} from '@/features/appointments/components/ProfessionalAvatar';
import type {
  AppointmentProfessionalSummary,
} from '@/features/appointments/types/appointments.types';

export function ProfessionalCard({
  professional,
  onSelect,
}: {
  professional:
    AppointmentProfessionalSummary;
  onSelect: () => void;
}) {
  return (
    <View className="rounded-2xl border border-coal-500/10 bg-white p-4 shadow-sm">
      <View className="flex-row items-center gap-3">
        <ProfessionalAvatar
          professional={
            professional
          }
          size={58}
        />

        <View className="flex-1">
          <Text className="text-base font-bold text-coal-900">
            {professional.full_name}
          </Text>

          <Text className="mt-0.5 text-sm text-coal-500">
            {professional.specialty}
          </Text>

          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons
              name="medical-outline"
              size={14}
              color="#007B7F"
            />

            <Text className="text-xs font-medium text-[#007B7F]">
              Consulta sus horarios al seleccionar
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={
          onSelect
        }
        className="mt-4 min-h-11 items-center justify-center rounded-xl bg-[#007B7F] px-4 active:opacity-80"
      >
        <Text className="text-sm font-semibold text-white">
          Seleccionar especialista
        </Text>
      </Pressable>
    </View>
  );
}
