import {
  Pressable,
  Text,
  View,
} from 'react-native';

import type {
  AppointmentAvailabilitySlot,
} from '@/features/appointments/types/appointments.types';
import {
  formatAppointmentTime,
} from '@/features/appointments/utils/appointments';

export function TimeSlotGrid({
  slots,
  selectedStart,
  onSelect,
}: {
  slots:
    AppointmentAvailabilitySlot[];
  selectedStart:
    string | null;
  onSelect: (
    slot:
      AppointmentAvailabilitySlot,
  ) => void;
}) {
  if (
    slots.length ===
    0
  ) {
    return (
      <View className="rounded-2xl bg-[#F1F6F7] p-4">
        <Text className="text-sm leading-5 text-coal-500">
          No hay horarios configurados para esta fecha. Selecciona otro día.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {slots.map(
        (
          slot,
        ) => {
          const selected =
            slot.inicio ===
            selectedStart;

          return (
            <Pressable
              key={`${slot.inicio}-${slot.fin}`}
              accessibilityRole="button"
              accessibilityState={{
                selected,
                disabled:
                  !slot.disponible,
              }}
              disabled={
                !slot.disponible
              }
              onPress={() =>
                onSelect(
                  slot,
                )
              }
              className="min-h-11 min-w-[30%] items-center justify-center rounded-xl border px-4"
              style={{
                borderColor:
                  selected
                    ? '#007B7F'
                    : '#D6DDE1',
                backgroundColor:
                  selected
                    ? '#E7F4F4'
                    : slot.disponible
                      ? '#FFFFFF'
                      : '#EDF0F2',
                opacity:
                  slot.disponible
                    ? 1
                    : 0.5,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color:
                    selected
                      ? '#006A6D'
                      : '#39434A',
                }}
              >
                {formatAppointmentTime(
                  slot.inicio,
                )}
              </Text>
            </Pressable>
          );
        },
      )}
    </View>
  );
}
