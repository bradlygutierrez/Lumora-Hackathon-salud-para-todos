import {
  Linking,
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
  AppointmentStatusBadge,
} from '@/features/appointments/components/AppointmentStatusBadge';
import {
  ProfessionalAvatar,
} from '@/features/appointments/components/ProfessionalAvatar';
import {
  useAppointmentDetail,
} from '@/features/appointments/hooks/useAppointmentDetail';
import {
  appointmentStatusName,
  appointmentTypeName,
  canManageAppointment,
  formatAppointmentDate,
  formatAppointmentTimeRange,
  isVirtualAppointmentType,
} from '@/features/appointments/utils/appointments';
import {
  canManagePatientData,
} from '@/features/caregiver-access/utils/caregiver-permissions';
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

export function AppointmentDetailScreen({
  appointmentId,
}: {
  appointmentId: number | null;
}) {
  const router =
    useRouter();

  const {
    activePatient,
    role,
  } =
    useShellContext();

  const patientId =
    activePatient?.patientId ??
    null;

  // A13 -- un cuidador de solo lectura puede ver el detalle de la cita
  // pero no reprogramarla ni cancelarla.
  const canManage =
    role !== 'caregiver' ||
    canManagePatientData(
      activePatient?.accessLevel ??
        null,
    );

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
        title="No pudimos abrir la cita"
        message="No existe un contexto de paciente válido."
      />
    );
  }

  if (
    query.isLoading
  ) {
    return (
      <FullScreenState
        title="Cargando cita"
        message="Estamos consultando el detalle de tu cita."
      />
    );
  }

  if (
    query.isError ||
    !query.data
  ) {
    const message =
      query.error instanceof
      ApiError &&
      query.error.code ===
        'FORBIDDEN'
        ? 'No tienes permiso para consultar esta cita.'
        : 'Revisa tu conexión e intenta nuevamente.';

    return (
      <FullScreenState
        title="No pudimos cargar la cita"
        message={
          message
        }
        actionLabel="Reintentar"
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const appointment =
    query.data;

  const status =
    appointmentStatusName(
      appointment,
    );

  const type =
    appointmentTypeName(
      appointment,
    );

  const manageable =
    canManage &&
    canManageAppointment(
      appointment,
    );

  const location =
    appointment.location;

  const openMaps =
    async () => {
      if (!location) {
        return;
      }

      const queryValue =
        location.latitud !==
          null &&
        location.latitud !==
          undefined &&
        location.longitud !==
          null &&
        location.longitud !==
          undefined
          ? `${location.latitud},${location.longitud}`
          : [
              location.nombre,
              location.direccion,
              location.consultorio,
            ]
              .filter(
                Boolean,
              )
              .join(
                ', ',
              );

      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          queryValue,
        )}`,
      );
    };

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      <AppHeader
        title="Cita"
        backFallbackHref="/(app)/(tabs)/appointments"
      />

      <View className="gap-4 px-4 py-4">
        <SurfaceCard>
          <View className="flex-row items-center gap-4">
            {appointment
              .professional ? (
              <ProfessionalAvatar
                professional={
                  appointment.professional
                }
                size={62}
              />
            ) : (
              <View className="h-[62px] w-[62px] items-center justify-center rounded-full bg-[#E7F4F4]">
                <Ionicons
                  name="person-outline"
                  size={26}
                  color="#007B7F"
                />
              </View>
            )}

            <View className="flex-1 gap-1">
              <AppointmentStatusBadge
                status={
                  status
                }
              />

              <Text className="mt-1 text-lg font-bold text-coal-900">
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
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View className="gap-4">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E7F4F4]">
                <Ionicons
                  name="calendar"
                  size={19}
                  color="#007B7F"
                />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-coal-500">
                  Fecha y hora
                </Text>

                <Text className="mt-1 text-base font-medium capitalize text-coal-900">
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

            <View className="h-px bg-coal-500/10" />

            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E7F4F4]">
                <Ionicons
                  name={
                    isVirtualAppointmentType(
                      appointment
                        .appointment_type,
                    )
                      ? 'videocam'
                      : 'medical'
                  }
                  size={19}
                  color="#007B7F"
                />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-coal-500">
                  Modalidad
                </Text>

                <Text className="mt-1 text-base font-medium text-coal-900">
                  {type}
                </Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        {location ? (
          <SurfaceCard>
            <View className="gap-3">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E7F4F4]">
                  <Ionicons
                    name="location"
                    size={19}
                    color="#007B7F"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-coal-500">
                    Ubicación
                  </Text>

                  <Text className="mt-1 text-base font-semibold text-coal-900">
                    {location.nombre}
                  </Text>

                  <Text className="mt-1 text-sm leading-5 text-coal-500">
                    {[
                      location.direccion,
                      location.consultorio,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        '\n',
                      )}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void openMaps();
                }}
                className="min-h-11 items-center justify-center rounded-xl border border-[#007B7F] px-4 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-[#007B7F]">
                  Abrir ubicación en mapas
                </Text>
              </Pressable>
            </View>
          </SurfaceCard>
        ) : null}

        {appointment.notas ? (
          <SurfaceCard>
            <Text className="text-xs font-semibold uppercase tracking-wide text-coal-500">
              Motivo de la consulta
            </Text>

            <Text className="mt-2 text-sm leading-6 text-coal-700">
              {appointment.notas}
            </Text>
          </SurfaceCard>
        ) : null}

        {manageable ? (
          <View className="gap-3 pb-4">
            <AppButton
              title="Reprogramar"
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname:
                    '/(app)/appointments/[appointmentId]/reschedule',
                  params: {
                    appointmentId:
                      String(
                        appointment.id,
                      ),
                  },
                })
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname:
                    '/(app)/appointments/[appointmentId]/cancel',
                  params: {
                    appointmentId:
                      String(
                        appointment.id,
                      ),
                  },
                })
              }
              className="min-h-12 items-center justify-center rounded-xl active:bg-[#FDECEC]"
            >
              <Text className="text-sm font-semibold text-[#C81E1E]">
                Cancelar cita
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
