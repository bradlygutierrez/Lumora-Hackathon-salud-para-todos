import {
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useRouter,
} from 'expo-router';

import {
  ProfessionalAvatar,
} from '@/features/appointments/components/ProfessionalAvatar';
import {
  useAppointmentDetail,
} from '@/features/appointments/hooks/useAppointmentDetail';
import {
  appointmentStatusName,
  formatAppointmentDate,
  formatAppointmentTimeRange,
  normalizeAppointmentText,
} from '@/features/appointments/utils/appointments';
import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';
import {
  AppButton,
} from '@/shared/components/AppButton';
import {
  FullScreenState,
} from '@/shared/components/FullScreenState';
import {
  Screen,
} from '@/shared/components/Screen';
import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

export function AppointmentConfirmationScreen({
  appointmentId,
}: {
  appointmentId:
    number | null;
}) {
  const router =
    useRouter();

  const {
    activePatient,
  } =
    useShellContext();

  const patientId =
    activePatient?.patientId ??
    null;

  const query =
    useAppointmentDetail(
      patientId,
      appointmentId,
    );

  if (
    patientId ===
      null ||
    appointmentId ===
      null
  ) {
    return (
      <FullScreenState
        title="No pudimos mostrar la confirmación"
        message="No existe un contexto de cita válido."
      />
    );
  }

  if (
    query.isLoading
  ) {
    return (
      <FullScreenState
        title="Confirmando cita"
        message="Estamos cargando el resumen de tu cita."
      />
    );
  }

  if (
    query.isError ||
    !query.data
  ) {
    return (
      <FullScreenState
        title="La cita fue creada"
        message="No pudimos cargar el resumen en este momento. Puedes verla desde Tus Citas."
        actionLabel="Ir a mis citas"
        onAction={() =>
          router.replace(
            '/(app)/(tabs)/appointments',
          )
        }
      />
    );
  }

  const appointment =
    query.data;

  const status =
    appointmentStatusName(
      appointment,
    );

  const isConfirmed =
    normalizeAppointmentText(
      status,
    ) ===
    'confirmada';

  return (
    <Screen
      scrollable
      contentClassName="gap-5"
      tint="appointments"
    >
      <View className="items-center gap-4 rounded-3xl bg-[#007B7F] px-5 py-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <Ionicons
            name="checkmark-circle"
            size={44}
            color="#FFFFFF"
          />
        </View>

        <View className="items-center gap-1">
          <Text className="text-3xl font-bold text-white">
            {isConfirmed
              ? '¡Cita confirmada!'
              : '¡Cita registrada!'}
          </Text>

          <Text className="text-center text-sm leading-5 text-white/80">
            {isConfirmed
              ? 'Tu cita quedó confirmada correctamente.'
              : `Tu solicitud se registró correctamente. Estado actual: ${status}.`}
          </Text>
        </View>
      </View>

      {appointment
        .professional ? (
        <SurfaceCard>
          <View className="flex-row items-center gap-3">
            <ProfessionalAvatar
              professional={
                appointment.professional
              }
              size={56}
            />

            <View className="flex-1">
              <Text className="text-base font-bold text-coal-900">
                {appointment
                  .professional
                  .full_name}
              </Text>

              <Text className="mt-0.5 text-sm text-coal-500">
                {appointment
                  .professional
                  .specialty}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <View className="gap-4">
          <View className="flex-row items-start gap-3">
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#007B7F"
            />

            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase text-coal-500">
                Fecha y hora
              </Text>

              <Text className="mt-1 text-sm font-medium capitalize text-coal-900">
                {formatAppointmentDate(
                  appointment.inicio,
                )}
              </Text>

              <Text className="mt-0.5 text-sm text-coal-500">
                {formatAppointmentTimeRange(
                  appointment.inicio,
                  appointment.fin,
                )}
              </Text>
            </View>
          </View>

          {appointment
            .location ? (
            <View className="flex-row items-start gap-3">
              <Ionicons
                name="location-outline"
                size={20}
                color="#007B7F"
              />

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase text-coal-500">
                  Ubicación
                </Text>

                <Text className="mt-1 text-sm font-medium text-coal-900">
                  {appointment
                    .location
                    .nombre}
                </Text>

                <Text className="mt-0.5 text-xs leading-5 text-coal-500">
                  {[
                    appointment
                      .location
                      .direccion,
                    appointment
                      .location
                      .consultorio,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      ' · ',
                    )}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </SurfaceCard>

      <View className="gap-3 pb-4">
        <AppButton
          title="Ver detalle de la cita"
          variant="ghost"
          onPress={() =>
            router.replace({
              pathname:
                '/(app)/appointments/[appointmentId]',
              params: {
                appointmentId:
                  String(
                    appointment.id,
                  ),
              },
            })
          }
        />

        <AppButton
          title="Ir a mis citas"
          onPress={() =>
            router.replace(
              '/(app)/(tabs)/appointments',
            )
          }
        />
      </View>
    </Screen>
  );
}
