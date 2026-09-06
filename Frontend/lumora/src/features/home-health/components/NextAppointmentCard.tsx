import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import type {
  AppointmentResponse,
  CatalogItem,
} from '@/features/home-health/types/home-health.types';

import {
  homeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

type NextAppointmentCardProps = {
  appointment: AppointmentResponse;
  appointmentTypes: CatalogItem[];
  emphasis?: boolean;
  onPress?: () => void;
};

/** Resumen de la próxima cita usando únicamente campos existentes del API. */
export function NextAppointmentCard({
  appointment,
  appointmentTypes,
  emphasis = false,
  onPress,
}: NextAppointmentCardProps) {
  const typeName = homeHealthPresenter.appointmentTypeName(
    appointment,
    appointmentTypes,
  );

  if (emphasis) {
    return (
      <View className="rounded-3xl bg-[#4A86B6] p-5">
        <Text className="text-xs font-semibold text-white/75">Próximo evento</Text>
        <Text className="mt-3 text-2xl font-bold text-white">{typeName}</Text>
        <Text className="mt-3 text-sm text-white">
          {homeHealthPresenter.formatAppointmentDate(appointment.inicio)}
        </Text>
        <Text className="mt-1 text-sm text-white/80">
          {appointment.professional?.full_name ?? 'Profesional asignado'}
          {appointment.professional?.specialty
            ? ` · ${appointment.professional.specialty}`
            : ''}
        </Text>

        {onPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            className="mt-5 rounded-2xl bg-white px-4 py-3 active:opacity-80"
          >
            <Text className="text-center text-sm font-semibold text-[#4A86B6]">
              Ver mis citas →
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="rounded-3xl border border-coal-500/10 bg-white p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#DCECF6]">
          <Ionicons name="calendar-outline" size={16} color="#4A86B6" />
        </View>
        <Text className="text-xs font-semibold text-coal-500">Próxima cita</Text>
      </View>

      <Text className="mt-4 text-lg font-bold text-coal-900">{typeName}</Text>
      <Text className="mt-1 text-sm text-coal-500">
        {homeHealthPresenter.formatAppointmentDate(appointment.inicio)}
      </Text>
      <Text className="mt-1 text-xs text-coal-500">
        {appointment.professional?.full_name ?? 'Profesional asignado'}
        {appointment.professional?.specialty
          ? ` · ${appointment.professional.specialty}`
          : ''}
      </Text>

      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          className="mt-4 rounded-2xl border border-[#DCECF6] px-4 py-3 active:opacity-80"
        >
          <Text className="text-center text-sm font-semibold text-[#4A86B6]">
            Ver detalles de cita
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
