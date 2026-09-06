import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  AppointmentStatusBadge,
} from '@/features/appointments/components/AppointmentStatusBadge';
import type {
  AppointmentResponse,
} from '@/features/appointments/types/appointments.types';
import {
  appointmentStatusName,
  appointmentTypeName,
  canManageAppointment,
  formatAppointmentDate,
  formatAppointmentTime,
} from '@/features/appointments/utils/appointments';
import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

type AppointmentCardProps = {
  appointment:
    AppointmentResponse;
  upcoming: boolean;
  onDetail: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  /**
   * A13 -- un cuidador de solo lectura puede ver la cita pero no
   * reprogramarla ni cancelarla. Por defecto true para no romper otros
   * llamadores (pacientes siempre pueden gestionar sus propias citas).
   */
  canManage?: boolean;
};

function SmallAction({
  label,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  onPress: () => void;
  tone?:
    | 'neutral'
    | 'primary'
    | 'danger';
}) {
  const palette =
    tone === 'danger'
      ? {
          borderColor:
            '#E5A4A4',
          color:
            '#B42318',
          backgroundColor:
            '#FFF7F7',
        }
      : tone ===
          'primary'
        ? {
            borderColor:
              '#0B8589',
            color:
              '#006A6D',
            backgroundColor:
              '#F4FBFB',
          }
        : {
            borderColor:
              '#D6DDE1',
            color:
              '#39434A',
            backgroundColor:
              '#F3F6F7',
          };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onPress
      }
      className="min-h-10 flex-1 items-center justify-center rounded-xl border px-3 active:opacity-70"
      style={{
        borderColor:
          palette.borderColor,
        backgroundColor:
          palette.backgroundColor,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{
          color:
            palette.color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AppointmentCard({
  appointment,
  upcoming,
  onDetail,
  onReschedule,
  onCancel,
  canManage = true,
}: AppointmentCardProps) {
  const status =
    appointmentStatusName(
      appointment,
    );

  const manageable =
    upcoming &&
    canManage &&
    canManageAppointment(
      appointment,
    );

  return (
    <SurfaceCard>
      <View className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <AppointmentStatusBadge
              status={
                status
              }
            />

            <Text className="mt-2 text-lg font-bold text-coal-900">
              {appointment
                .professional
                ?.full_name ??
                'Profesional no disponible'}
            </Text>

            <Text className="text-sm text-coal-500">
              {appointment
                .professional
                ?.specialty ??
                'Especialidad no disponible'}
            </Text>
          </View>

          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E8F4F5]">
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color="#64727A"
            />
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-start gap-3">
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#63727A"
            />

            <View className="flex-1">
              <Text className="text-sm font-medium text-coal-900">
                {formatAppointmentDate(
                  appointment.inicio,
                )}
              </Text>

              <Text className="mt-0.5 text-sm text-coal-500">
                {formatAppointmentTime(
                  appointment.inicio,
                )}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start gap-3">
            <Ionicons
              name={
                appointmentTypeName(
                  appointment,
                )
                  .toLocaleLowerCase(
                    'es',
                  )
                  .includes(
                    'virtual',
                  )
                  ? 'videocam-outline'
                  : 'location-outline'
              }
              size={18}
              color="#63727A"
            />

            <Text className="flex-1 text-sm text-coal-600">
              {appointment
                .location
                ? [
                    appointment
                      .location
                      .nombre,
                    appointment
                      .location
                      .consultorio,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      ' · ',
                    )
                : appointmentTypeName(
                    appointment,
                  )}
            </Text>
          </View>
        </View>

        <View className="h-px bg-coal-500/10" />

        {manageable ? (
          <View className="gap-2">
            <View className="flex-row gap-2">
              {onReschedule ? (
                <SmallAction
                  label="Reprogramar"
                  tone="neutral"
                  onPress={
                    onReschedule
                  }
                />
              ) : null}

              <SmallAction
                label="Detalles"
                tone="primary"
                onPress={
                  onDetail
                }
              />
            </View>

            {onCancel ? (
              <Pressable
                accessibilityRole="button"
                onPress={
                  onCancel
                }
                className="min-h-9 items-center justify-center active:opacity-70"
              >
                <Text className="text-xs font-semibold text-[#B42318]">
                  Cancelar cita
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <SmallAction
            label="Ver detalles"
            tone="primary"
            onPress={
              onDetail
            }
          />
        )}
      </View>
    </SurfaceCard>
  );
}
