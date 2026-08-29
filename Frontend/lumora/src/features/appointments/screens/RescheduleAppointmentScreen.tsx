import {
  useEffect,
  useState,
} from 'react';

import {
  Pressable,
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
  AppointmentCalendar,
} from '@/features/appointments/components/AppointmentCalendar';
import {
  ProfessionalAvatar,
} from '@/features/appointments/components/ProfessionalAvatar';
import {
  TimeSlotGrid,
} from '@/features/appointments/components/TimeSlotGrid';
import {
  useAppointmentDetail,
} from '@/features/appointments/hooks/useAppointmentDetail';
import {
  useAppointmentMutations,
} from '@/features/appointments/hooks/useAppointmentMutations';
import {
  useAvailability,
} from '@/features/appointments/hooks/useAvailability';
import type {
  AppointmentAvailabilitySlot,
} from '@/features/appointments/types/appointments.types';
import {
  canManageAppointment,
  formatAppointmentDate,
  formatAppointmentTimeRange,
  toDateKey,
  todayDateKey,
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

export function RescheduleAppointmentScreen({
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

  const detailQuery =
    useAppointmentDetail(
      patientId,
      appointmentId,
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      todayDateKey(),
    );

  const [
    initialized,
    setInitialized,
  ] =
    useState(
      false,
    );

  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<
      AppointmentAvailabilitySlot | null
    >(
      null,
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

  const appointment =
    detailQuery.data ??
    null;

  const professionalId =
    appointment?.profesional_id ??
    null;

  const availabilityQuery =
    useAvailability(
      professionalId,
      selectedDate,
    );

  const {
    reschedule,
  } =
    useAppointmentMutations(
      patientId,
    );

  useEffect(
    () => {
      if (
        !appointment ||
        initialized
      ) {
        return;
      }

      const originalDate =
        toDateKey(
          new Date(
            appointment.inicio,
          ),
        );

      setSelectedDate(
        originalDate <
          todayDateKey()
          ? todayDateKey()
          : originalDate,
      );

      setInitialized(
        true,
      );
    },
    [
      appointment,
      initialized,
    ],
  );

  useEffect(
    () => {
      setSelectedSlot(
        null,
      );
    },
    [
      selectedDate,
    ],
  );

  if (
    patientId ===
      null ||
    appointmentId ===
      null
  ) {
    return (
      <FullScreenState
        title="No pudimos reprogramar"
        message="No existe un contexto de paciente o cita válido."
      />
    );
  }

  if (
    detailQuery.isLoading
  ) {
    return (
      <FullScreenState
        title="Cargando cita"
        message="Estamos preparando la reprogramación."
      />
    );
  }

  if (
    detailQuery.isError ||
    !appointment
  ) {
    return (
      <FullScreenState
        title="No pudimos cargar la cita"
        message="Revisa tu conexión e intenta nuevamente."
        actionLabel="Reintentar"
        onAction={() => {
          void detailQuery.refetch();
        }}
      />
    );
  }

  if (
    !canManageAppointment(
      appointment,
    )
  ) {
    return (
      <FullScreenState
        title="Esta cita no puede reprogramarse"
        message="Las citas canceladas, completadas o finalizadas ya no pueden modificarse."
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

      if (
        !selectedSlot
      ) {
        setErrorMessage(
          'Selecciona un nuevo horario disponible.',
        );
        return;
      }

      try {
        await reschedule.mutateAsync({
          appointmentId:
            appointment.id,
          data: {
            inicio:
              selectedSlot.inicio,
            fin:
              selectedSlot.fin,
          },
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
            : 'No pudimos reprogramar la cita.',
        );
      }
    };

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      <AppHeader
        title="Reprogramar Cita"
        backFallbackHref="/(app)/(tabs)/appointments"
      />

      <View className="gap-5 px-4 py-4">
        <SurfaceCard>
          <Text className="text-sm font-semibold text-coal-700">
            Cita original
          </Text>

          <View className="mt-4 flex-row items-start gap-3">
            {appointment
              .professional ? (
              <ProfessionalAvatar
                professional={
                  appointment.professional
                }
                size={52}
              />
            ) : (
              <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#E7F4F4]">
                <Ionicons
                  name="person-outline"
                  size={22}
                  color="#007B7F"
                />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-base font-bold text-coal-900">
                {appointment
                  .professional
                  ?.full_name ??
                  'Profesional no disponible'}
              </Text>

              <Text className="mt-0.5 text-sm text-coal-500">
                {appointment
                  .professional
                  ?.specialty ??
                  'Especialidad no disponible'}
              </Text>
            </View>
          </View>

          <View className="mt-4 gap-2 border-t border-coal-500/10 pt-4">
            <Text className="text-sm font-medium capitalize text-coal-900">
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
              <Text className="text-sm text-coal-500">
                {[
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
                  )}
              </Text>
            ) : null}
          </View>
        </SurfaceCard>

        <View className="gap-3">
          <Text className="text-xl font-bold text-coal-900">
            Selecciona una nueva fecha
          </Text>

          <AppointmentCalendar
            selectedDate={
              selectedDate
            }
            onSelectDate={
              setSelectedDate
            }
          />
        </View>

        <View className="gap-3">
          <Text className="text-xl font-bold text-coal-900">
            Horarios disponibles
          </Text>

          {availabilityQuery
            .isLoading ? (
            <Text className="text-sm text-coal-500">
              Consultando horarios...
            </Text>
          ) : availabilityQuery
              .isError ? (
            <View className="gap-2 rounded-2xl bg-[#FFF4F4] p-4">
              <Text className="text-sm text-[#9D2C2C]">
                No pudimos consultar los horarios.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void availabilityQuery.refetch();
                }}
              >
                <Text className="text-sm font-semibold text-[#007B7F]">
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : (
            <TimeSlotGrid
              slots={
                availabilityQuery
                  .data?.slots ??
                []
              }
              selectedStart={
                selectedSlot
                  ?.inicio ??
                null
              }
              onSelect={
                setSelectedSlot
              }
            />
          )}
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
            title="Confirmar reprogramación"
            loading={
              reschedule.isPending
            }
            disabled={
              !selectedSlot
            }
            onPress={() => {
              void submit();
            }}
          />

          <AppButton
            title="Cancelar"
            variant="ghost"
            onPress={() =>
              router.back()
            }
          />
        </View>
      </View>
    </Screen>
  );
}
