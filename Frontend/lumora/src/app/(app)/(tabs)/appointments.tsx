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
  useQuery,
} from '@tanstack/react-query';

import {
  homeHealthService,
} from '@/features/home-health/api/HomeHealthService';

import type {
  AppointmentResponse,
  CatalogItem,
} from '@/features/home-health/types/home-health.types';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

import {
  patientQueryKeys,
} from '@/features/shell/query/patient-query-keys';

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

type AppointmentTab =
  | 'upcoming'
  | 'previous';

type AppointmentsQueryData = {
  appointments:
    AppointmentResponse[];

  types:
    CatalogItem[];

  statuses:
    CatalogItem[];
};

/**
 * Reglas puras de presentación de citas.
 *
 * La pantalla se limita a renderizar.
 * Esta clase se encarga de:
 *
 * - dividir próximas/anteriores;
 * - resolver catálogos;
 * - formatear fechas;
 * - presentar profesionales.
 */
class AppointmentsPresenter {
  /**
   * Consideramos próxima una cita que todavía
   * no ha terminado.
   *
   * Esto permite que una cita actualmente
   * en progreso permanezca en "Próximas".
   */
  public upcoming(
    appointments:
      AppointmentResponse[],
    now = new Date(),
  ): AppointmentResponse[] {
    const timestamp =
      now.getTime();

    return appointments
      .filter(
        (appointment) =>
          new Date(
            appointment.fin,
          ).getTime() >=
          timestamp,
      )
      .sort(
        (a, b) =>
          new Date(
            a.inicio,
          ).getTime() -
          new Date(
            b.inicio,
          ).getTime(),
      );
  }

  /**
   * Citas cuya fecha de finalización ya pasó.
   *
   * Las mostramos más recientes primero.
   */
  public previous(
    appointments:
      AppointmentResponse[],
    now = new Date(),
  ): AppointmentResponse[] {
    const timestamp =
      now.getTime();

    return appointments
      .filter(
        (appointment) =>
          new Date(
            appointment.fin,
          ).getTime() <
          timestamp,
      )
      .sort(
        (a, b) =>
          new Date(
            b.inicio,
          ).getTime() -
          new Date(
            a.inicio,
          ).getTime(),
      );
  }

  /**
   * Convierte tipo_cita_id a nombre.
   */
  public typeName(
    appointment:
      AppointmentResponse,
    types:
      CatalogItem[],
  ): string {
    if (
      appointment.tipo_cita_id ===
      null
    ) {
      return 'Consulta médica';
    }

    return (
      types.find(
        (type) =>
          type.id ===
          appointment.tipo_cita_id,
      )?.nombre ??
      'Consulta médica'
    );
  }

  /**
   * Convierte estado_cita_id a nombre.
   */
  public statusName(
    appointment:
      AppointmentResponse,
    statuses:
      CatalogItem[],
  ): string {
    if (
      appointment.estado_cita_id ===
      null
    ) {
      return 'Sin estado';
    }

    return (
      statuses.find(
        (status) =>
          status.id ===
          appointment.estado_cita_id,
      )?.nombre ??
      'Sin estado'
    );
  }

  /**
   * Nombre del médico proveniente directamente
   * del nuevo ProfessionalSummary de B10.
   */
  public professionalName(
    appointment:
      AppointmentResponse,
  ): string {
    return (
      appointment
        .professional
        ?.full_name ??
      'Profesional no disponible'
    );
  }

  /**
   * Especialidad real del profesional.
   */
  public specialty(
    appointment:
      AppointmentResponse,
  ): string {
    return (
      appointment
        .professional
        ?.specialty ??
      'Especialidad no disponible'
    );
  }

  /**
   * Fecha amigable para Nicaragua.
   */
  public date(
    appointment:
      AppointmentResponse,
  ): string {
    return new Intl.DateTimeFormat(
      'es-NI',
      {
        weekday:
          'short',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric',

        hour:
          'numeric',

        minute:
          '2-digit',
      },
    ).format(
      new Date(
        appointment.inicio,
      ),
    );
  }

  /**
   * Duración real calculada usando inicio/fin.
   */
  public duration(
    appointment:
      AppointmentResponse,
  ): string {
    const start =
      new Date(
        appointment.inicio,
      ).getTime();

    const end =
      new Date(
        appointment.fin,
      ).getTime();

    const minutes =
      Math.max(
        0,
        Math.round(
          (end - start) /
            60_000,
        ),
      );

    if (
      minutes < 60
    ) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(
        minutes / 60,
      );

    const remaining =
      minutes % 60;

    if (
      remaining === 0
    ) {
      return `${hours} h`;
    }

    return `${hours} h ${remaining} min`;
  }
}

const appointmentsPresenter =
  new AppointmentsPresenter();

type AppointmentCardProps = {
  appointment:
    AppointmentResponse;

  appointmentTypes:
    CatalogItem[];

  appointmentStatuses:
    CatalogItem[];
};

/**
 * Tarjeta de cita completamente alimentada
 * por FastAPI.
 *
 * No contiene nombres, fechas o especialidades
 * hardcodeadas.
 */
function AppointmentCard({
  appointment,
  appointmentTypes,
  appointmentStatuses,
}: AppointmentCardProps) {
  const status =
    appointmentsPresenter
      .statusName(
        appointment,
        appointmentStatuses,
      );

  const type =
    appointmentsPresenter
      .typeName(
        appointment,
        appointmentTypes,
      );

  return (
    <SurfaceCard>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="self-start rounded-full bg-[#dbeaf7] px-3 py-1.5">
            <Text className="text-xs font-semibold text-[#4A86B6]">
              {status}
            </Text>
          </View>

          <Text className="mt-4 text-xl font-bold text-coal-900">
            {
              appointmentsPresenter
                .professionalName(
                  appointment,
                )
            }
          </Text>

          <Text className="mt-1 text-sm font-medium text-[#4A86B6]">
            {
              appointmentsPresenter
                .specialty(
                  appointment,
                )
            }
          </Text>

          <Text className="mt-1 text-sm text-coal-500">
            {type}
          </Text>
        </View>

        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef5fa]">
          <Ionicons
            name="calendar-outline"
            size={20}
            color="#4A86B6"
          />
        </View>
      </View>

      <View className="mt-5 gap-3 border-t border-coal-500/10 pt-4">
        <View className="flex-row items-start gap-3">
          <Ionicons
            name="time-outline"
            size={18}
            color="#7B848B"
          />

          <View className="flex-1">
            <Text className="text-sm font-medium text-coal-900">
              {
                appointmentsPresenter
                  .date(
                    appointment,
                  )
              }
            </Text>

            <Text className="mt-1 text-xs text-coal-500">
              Duración:{' '}
              {
                appointmentsPresenter
                  .duration(
                    appointment,
                  )
              }
            </Text>
          </View>
        </View>

        {appointment.notas ? (
          <View className="flex-row items-start gap-3">
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#7B848B"
            />

            <Text className="flex-1 text-sm leading-5 text-coal-500">
              {
                appointment.notas
              }
            </Text>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

/**
 * Pantalla de citas B10.
 *
 * Usa siempre activePatient de B09.
 *
 * Por eso funciona tanto para:
 *
 * Paciente:
 *   sus propias citas.
 *
 * Caregiver:
 *   las citas del paciente actualmente seleccionado.
 */
export default function AppointmentsRoute() {
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
    activePatient?.patientId;

  const appointmentsQuery =
    useQuery({
      queryKey:
        patientId
          ? [
              ...patientQueryKeys
                .appointments(
                  patientId,
                ),

              'full-list',
            ]
          : [
              'patient',
              'appointments',
              'no-context',
            ],

      enabled:
        patientId !==
        undefined,

      queryFn:
        async (): Promise<AppointmentsQueryData> => {
          if (
            patientId ===
            undefined
          ) {
            throw new Error(
              'No existe patientContext activo.',
            );
          }

          /**
           * Pedimos historial completo de citas.
           *
           * null significa que NO enviamos `desde`.
           */
          const [
            appointments,
            types,
            statuses,
          ] =
            await Promise.all([
              homeHealthService
                .getAppointments(
                  patientId,
                  null,
                ),

              homeHealthService
                .getAppointmentTypes(),

              homeHealthService
                .getAppointmentStatuses(),
            ]);

          return {
            appointments,
            types:
              types.items,

            statuses:
              statuses.items,
          };
        },
    });

  const upcoming =
    useMemo(
      () =>
        appointmentsPresenter
          .upcoming(
            appointmentsQuery
              .data
              ?.appointments ??
              [],
          ),

      [
        appointmentsQuery
          .data
          ?.appointments,
      ],
    );

  const previous =
    useMemo(
      () =>
        appointmentsPresenter
          .previous(
            appointmentsQuery
              .data
              ?.appointments ??
              [],
          ),

      [
        appointmentsQuery
          .data
          ?.appointments,
      ],
    );

  const visibleAppointments =
    activeTab ===
    'upcoming'
      ? upcoming
      : previous;

  /**
   * B09 todavía está preparando
   * el patientContext.
   */
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

  /**
   * Para un Paciente esto representa un fallo
   * resolviendo /patients/me.
   *
   * Para Caregiver normalmente el route guard
   * lo enviará primero a select-patient.
   */
  if (!patientId) {
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
            ? 'Selecciona el paciente que deseas consultar.'
            : 'No fue posible resolver tu perfil de paciente.'
        }
      />
    );
  }

  if (
    appointmentsQuery
      .isLoading
  ) {
    return (
      <FullScreenState
        title="Cargando citas"
        message="Estamos consultando tus citas médicas."
      />
    );
  }

  if (
    appointmentsQuery
      .isError
  ) {
    return (
      <FullScreenState
        title="No pudimos cargar tus citas"
        message="Revisa tu conexión e intenta nuevamente."
        actionLabel="Reintentar"
        onAction={() => {
          void appointmentsQuery
            .refetch();
        }}
      />
    );
  }

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
            ? `Citas de ${activePatient.displayName}`
            : 'Gestiona tus próximas consultas y revisa tu historial.'
        }
        showNotification
      />

      <View className="gap-5 px-4 py-4">
        {/* ===============================
            TABS
           =============================== */}

        <View className="flex-row border-b border-coal-500/10">
          <Pressable
            accessibilityRole="button"
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
                  ? 'text-base font-semibold text-[#4A86B6]'
                  : 'text-base font-medium text-coal-500'
              }
            >
              Próximas
            </Text>

            {activeTab ===
            'upcoming' ? (
              <View className="absolute bottom-0 h-0.5 w-full rounded-full bg-[#4A86B6]" />
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
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
                  ? 'text-base font-semibold text-[#4A86B6]'
                  : 'text-base font-medium text-coal-500'
              }
            >
              Anteriores
            </Text>

            {activeTab ===
            'previous' ? (
              <View className="absolute bottom-0 h-0.5 w-full rounded-full bg-[#4A86B6]" />
            ) : null}
          </Pressable>
        </View>

        {/* ===============================
            RESULTADOS
           =============================== */}

        {visibleAppointments.length >
        0 ? (
          <View className="gap-4">
            {visibleAppointments.map(
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
                  appointmentTypes={
                    appointmentsQuery
                      .data
                      ?.types ??
                    []
                  }
                  appointmentStatuses={
                    appointmentsQuery
                      .data
                      ?.statuses ??
                    []
                  }
                />
              ),
            )}
          </View>
        ) : (
          <SurfaceCard className="items-center py-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#eef5fa]">
              <Ionicons
                name="calendar-outline"
                size={28}
                color="#4A86B6"
              />
            </View>

            <Text className="mt-5 text-center text-xl font-semibold text-coal-900">
              {activeTab ===
              'upcoming'
                ? 'No tienes citas próximas'
                : 'No tienes citas anteriores'}
            </Text>

            <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-coal-500">
              {activeTab ===
              'upcoming'
                ? 'Cuando tengas una nueva consulta programada aparecerá aquí.'
                : 'Tu historial de consultas aparecerá aquí cuando existan citas anteriores.'}
            </Text>
          </SurfaceCard>
        )}
      </View>
    </Screen>
  );
}