import {
  useMemo,
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
  AppointmentCard,
} from '@/features/appointments/components/AppointmentCard';
import {
  useAppointments,
} from '@/features/appointments/hooks/useAppointments';
import {
  splitAppointments,
} from '@/features/appointments/utils/appointments';
import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';
import {
  AppHeader,
} from '@/shared/components/AppHeader';
import {
  FullScreenState,
} from '@/shared/components/FullScreenState';
import {
  Screen,
} from '@/shared/components/Screen';

type AppointmentTab =
  | 'upcoming'
  | 'previous';

export function AppointmentsListScreen() {
  const router =
    useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<AppointmentTab>(
      'upcoming',
    );

  const {
    status:
      shellStatus,
    role,
    activePatient,
  } =
    useShellContext();

  const patientId =
    activePatient?.patientId ??
    null;

  const query =
    useAppointments(
      patientId,
    );

  const split =
    useMemo(
      () =>
        splitAppointments(
          query.data ?? [],
        ),
      [
        query.data,
      ],
    );

  if (
    shellStatus ===
      'idle' ||
    shellStatus ===
      'loading'
  ) {
    return (
      <FullScreenState
        title="Cargando citas"
        message="Estamos preparando tu información."
      />
    );
  }

  if (
    patientId ===
    null
  ) {
    return (
      <FullScreenState
        title={
          role ===
          'caregiver'
            ? 'Selecciona un paciente'
            : 'No pudimos cargar tu perfil'
        }
        message={
          role ===
          'caregiver'
            ? 'Selecciona el paciente cuyas citas deseas consultar.'
            : 'No fue posible resolver tu perfil de paciente.'
        }
      />
    );
  }

  if (
    query.isLoading
  ) {
    return (
      <FullScreenState
        title="Cargando citas"
        message="Estamos consultando tus citas médicas."
      />
    );
  }

  if (
    query.isError
  ) {
    return (
      <FullScreenState
        title="No pudimos cargar tus citas"
        message="Revisa tu conexión e intenta nuevamente."
        actionLabel="Reintentar"
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const visible =
    activeTab ===
    'upcoming'
      ? split.upcoming
      : split.previous;

  const openDetail = (
    appointmentId: number,
  ) => {
    router.push({
      pathname:
        '/(app)/appointments/[appointmentId]',
      params: {
        appointmentId:
          String(
            appointmentId,
          ),
      },
    });
  };

  const openReschedule = (
    appointmentId: number,
  ) => {
    router.push({
      pathname:
        '/(app)/appointments/[appointmentId]/reschedule',
      params: {
        appointmentId:
          String(
            appointmentId,
          ),
      },
    });
  };

  const openCancel = (
    appointmentId: number,
  ) => {
    router.push({
      pathname:
        '/(app)/appointments/[appointmentId]/cancel',
      params: {
        appointmentId:
          String(
            appointmentId,
          ),
      },
    });
  };

  const openProfessionals =
    () => {
      router.push(
        '/(app)/appointments/find-professional',
      );
    };

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      <AppHeader
        title="Tus Citas"
        subtitle={
          role ===
          'caregiver'
            ? `Gestiona las citas de ${activePatient?.displayName ?? 'tu paciente'}.`
            : 'Gestiona tus próximas consultas y revisa tu historial.'
        }
        showBackButton={
          false
        }
        showNotification
        onNotificationPress={() =>
          router.push(
            '/(app)/notifications',
          )
        }
      />

      <View className="gap-5 px-4 py-4">
        <Pressable
          accessibilityRole="button"
          onPress={
            openProfessionals
          }
          className="self-start flex-row items-center gap-2 rounded-full bg-[#67B5D8] px-4 py-3 active:opacity-80"
        >
          <Ionicons
            name="add"
            size={18}
            color="#FFFFFF"
          />

          <Text className="text-sm font-semibold text-white">
            Solicitar nueva cita
          </Text>
        </Pressable>

        <View className="flex-row border-b border-coal-500/10">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{
              selected:
                activeTab ===
                'upcoming',
            }}
            onPress={() =>
              setActiveTab(
                'upcoming',
              )
            }
            className="flex-1 items-center pb-3"
          >
            <Text
              className={
                activeTab ===
                'upcoming'
                  ? 'text-base font-semibold text-[#67B5D8]'
                  : 'text-base font-medium text-coal-500'
              }
            >
              Próximas
            </Text>

            {activeTab ===
            'upcoming' ? (
              <View className="absolute bottom-0 h-0.5 w-full rounded-full bg-[#67B5D8]" />
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{
              selected:
                activeTab ===
                'previous',
            }}
            onPress={() =>
              setActiveTab(
                'previous',
              )
            }
            className="flex-1 items-center pb-3"
          >
            <Text
              className={
                activeTab ===
                'previous'
                  ? 'text-base font-semibold text-[#67B5D8]'
                  : 'text-base font-medium text-coal-500'
              }
            >
              Anteriores
            </Text>

            {activeTab ===
            'previous' ? (
              <View className="absolute bottom-0 h-0.5 w-full rounded-full bg-[#67B5D8]" />
            ) : null}
          </Pressable>
        </View>

        {visible.length ===
        0 ? (
          <View className="items-center gap-3 rounded-3xl bg-[#EAF2F4] px-5 py-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F7FBFC]">
              <Ionicons
                name="calendar-outline"
                size={26}
                color="#67B5D8"
              />
            </View>

            <Text className="text-center text-base font-semibold text-coal-700">
              {activeTab ===
              'upcoming'
                ? 'No tienes más citas próximas'
                : 'No tienes citas anteriores'}
            </Text>

            <Text className="text-center text-sm leading-5 text-coal-500">
              {activeTab ===
              'upcoming'
                ? 'Mantén tu salud al día programando tus próximas consultas.'
                : 'Tu historial aparecerá aquí cuando tengas consultas anteriores.'}
            </Text>

            {activeTab ===
            'upcoming' ? (
              <Pressable
                accessibilityRole="button"
                onPress={
                  openProfessionals
                }
                className="mt-1 px-3 py-2 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-[#67B5D8]">
                  Ver doctores disponibles
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="gap-4">
            {visible.map(
              (
                appointment,
              ) => (
                <AppointmentCard
                  key={
                    appointment.id
                  }
                  appointment={
                    appointment
                  }
                  upcoming={
                    activeTab ===
                    'upcoming'
                  }
                  onDetail={() =>
                    openDetail(
                      appointment.id,
                    )
                  }
                  onReschedule={() =>
                    openReschedule(
                      appointment.id,
                    )
                  }
                  onCancel={() =>
                    openCancel(
                      appointment.id,
                    )
                  }
                />
              ),
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
