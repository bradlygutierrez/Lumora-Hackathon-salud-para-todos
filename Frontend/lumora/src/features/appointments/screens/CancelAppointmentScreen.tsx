import {
  useState,
} from 'react';

import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useRouter,
} from 'expo-router';

import {
  useAppointmentDetail,
} from '@/features/appointments/hooks/useAppointmentDetail';
import {
  useAppointmentMutations,
} from '@/features/appointments/hooks/useAppointmentMutations';
import {
  cancellationReasonSchema,
} from '@/features/appointments/schemas/appointments.schemas';
import {
  canManageAppointment,
  formatAppointmentDate,
  formatAppointmentTimeRange,
} from '@/features/appointments/utils/appointments';
import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';
import {
  ApiError,
} from '@/shared/api/api-error';
import {
  AppButton,
} from '@/shared/components/AppButton';
import {
  AppHeader,
} from '@/shared/components/AppHeader';
import {
  FullScreenState,
} from '@/shared/components/FullScreenState';
import {
  Screen,
} from '@/shared/components/Screen';
import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

const REASONS = [
  'Conflicto de horario',
  'Ya no necesito la consulta',
  'Motivos de salud (enfermedad)',
  'Otro motivo',
] as const;

export function CancelAppointmentScreen({
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

  const {
    cancel,
  } =
    useAppointmentMutations(
      patientId,
    );

  const [
    selectedReason,
    setSelectedReason,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    otherReason,
    setOtherReason,
  ] =
    useState(
      '',
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  if (
    patientId ===
      null ||
    appointmentId ===
      null
  ) {
    return (
      <FullScreenState
        title="No pudimos cancelar"
        message="No existe un contexto de paciente o cita válido."
      />
    );
  }

  if (
    query.isLoading
  ) {
    return (
      <FullScreenState
        title="Cargando cita"
        message="Estamos preparando la confirmación de cancelación."
      />
    );
  }

  if (
    query.isError ||
    !query.data
  ) {
    return (
      <FullScreenState
        title="No pudimos cargar la cita"
        message="Revisa tu conexión e intenta nuevamente."
        actionLabel="Reintentar"
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const appointment =
    query.data;

  if (
    !canManageAppointment(
      appointment,
    )
  ) {
    return (
      <FullScreenState
        title="Esta cita ya no puede cancelarse"
        message="Las citas canceladas, completadas o finalizadas no admiten esta operación."
        actionLabel="Ver detalle"
        onAction={() =>
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
    );
  }

  const submit =
    async () => {
      setErrorMessage(
        null,
      );

      const rawReason =
        selectedReason ===
        'Otro motivo'
          ? otherReason
          : selectedReason ??
            '';

      const parsed =
        cancellationReasonSchema
          .safeParse(
            rawReason,
          );

      if (
        !parsed.success
      ) {
        setErrorMessage(
          parsed.error
            .issues[0]
            ?.message ??
            'Revisa el motivo de cancelación.',
        );
        return;
      }

      try {
        await cancel.mutateAsync({
          appointmentId:
            appointment.id,
          reason:
            parsed.data ||
            null,
        });

        router.replace({
          pathname:
            '/(app)/appointments/[appointmentId]',
          params: {
            appointmentId:
              String(
                appointment.id,
              ),
          },
        });
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof
            ApiError
            ? error.message
            : 'No pudimos cancelar la cita.',
        );
      }
    };

  return (
    <Screen
      scrollable
      keyboardAvoiding
      contentClassName="px-0 py-0"
      tint="appointments"
    >
      <AppHeader
        title="Cancelar cita"
        backFallbackHref="/(app)/(tabs)/appointments"
      />

      <View className="gap-5 px-4 py-4">
        <View className="items-center gap-3 rounded-3xl bg-white px-5 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FDE4E4]">
            <Ionicons
              name="calendar-clear-outline"
              size={28}
              color="#C81E1E"
            />
          </View>

          <Text className="text-center text-2xl font-bold text-coal-900">
            ¿Estás seguro de que deseas cancelar tu cita?
          </Text>

          <Text className="text-center text-sm leading-5 text-coal-500">
            Esta acción cambia el estado de la cita a Cancelada y la conservará en tu historial.
          </Text>
        </View>

        <SurfaceCard>
          <Text className="text-sm font-semibold text-coal-700">
            Resumen de la cita
          </Text>

          <View className="mt-4 gap-2">
            <Text className="text-base font-bold text-coal-900">
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

            <View className="mt-2 h-px bg-coal-500/10" />

            <Text className="mt-2 text-sm font-medium capitalize text-coal-900">
              {formatAppointmentDate(
                appointment.inicio,
              )}
            </Text>

            <Text className="text-sm text-coal-500">
              {formatAppointmentTimeRange(
                appointment.inicio,
                appointment.fin,
              )}
            </Text>

            {appointment
              .location ? (
              <Text className="text-sm leading-5 text-coal-500">
                {[
                  appointment
                    .location
                    .nombre,
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
            ) : null}
          </View>
        </SurfaceCard>

        <View className="gap-3">
          <Text className="text-lg font-bold text-coal-900">
            Motivo de la cancelación
          </Text>

          <Text className="text-sm text-coal-500">
            Opcional
          </Text>

          <View className="gap-2">
            {REASONS.map(
              (
                reason,
              ) => {
                const selected =
                  selectedReason ===
                  reason;

                return (
                  <Pressable
                    key={
                      reason
                    }
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setSelectedReason(
                        selected
                          ? null
                          : reason,
                      )
                    }
                    className="flex-row items-center gap-3 rounded-xl border bg-white px-4 py-3"
                    style={{
                      borderColor:
                        selected
                          ? '#007B7F'
                          : '#DDE3E6',
                    }}
                  >
                    <View
                      className="h-5 w-5 items-center justify-center rounded-full border"
                      style={{
                        borderColor:
                          selected
                            ? '#007B7F'
                            : '#B7C0C5',
                      }}
                    >
                      {selected ? (
                        <View className="h-2.5 w-2.5 rounded-full bg-[#007B7F]" />
                      ) : null}
                    </View>

                    <Text className="flex-1 text-sm text-coal-700">
                      {reason}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          {selectedReason ===
          'Otro motivo' ? (
            <TextInput
              value={
                otherReason
              }
              onChangeText={
                setOtherReason
              }
              placeholder="Describe brevemente el motivo"
              placeholderTextColor="#8B949A"
              maxLength={
                500
              }
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-2xl border border-coal-500/15 bg-white px-4 py-3 text-sm text-coal-900"
            />
          ) : null}
        </View>

        {errorMessage ? (
          <View className="rounded-2xl bg-[#FFF0F0] p-4">
            <Text className="text-sm text-[#A62A2A]">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View className="gap-3 pb-5">
          <AppButton
            title="Mantener cita"
            variant="ghost"
            disabled={
              cancel.isPending
            }
            onPress={() =>
              router.back()
            }
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy:
                cancel.isPending,
              disabled:
                cancel.isPending,
            }}
            disabled={
              cancel.isPending
            }
            onPress={() => {
              void submit();
            }}
            className="min-h-12 items-center justify-center rounded-xl bg-[#CF2026] px-5 active:opacity-80"
            style={{
              opacity:
                cancel.isPending
                  ? 0.6
                  : 1,
            }}
          >
            <Text className="text-sm font-bold text-white">
              {cancel.isPending
                ? 'Cancelando...'
                : 'Confirmar cancelación'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
