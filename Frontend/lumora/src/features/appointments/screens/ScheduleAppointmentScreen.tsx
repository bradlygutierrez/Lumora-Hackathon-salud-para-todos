import {
  useEffect,
  useMemo,
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
  AppointmentCalendar,
} from '@/features/appointments/components/AppointmentCalendar';
import {
  ProfessionalAvatar,
} from '@/features/appointments/components/ProfessionalAvatar';
import {
  TimeSlotGrid,
} from '@/features/appointments/components/TimeSlotGrid';
import {
  useAppointmentLocations,
  useAppointmentTypes,
} from '@/features/appointments/hooks/useAppointmentCatalogs';
import {
  useAppointmentMutations,
} from '@/features/appointments/hooks/useAppointmentMutations';
import {
  useAvailability,
} from '@/features/appointments/hooks/useAvailability';
import {
  useProfessionals,
} from '@/features/appointments/hooks/useProfessionals';
import {
  appointmentNotesSchema,
} from '@/features/appointments/schemas/appointments.schemas';
import type {
  AppointmentAvailabilitySlot,
} from '@/features/appointments/types/appointments.types';
import {
  isPhysicalAppointmentType,
  normalizeAppointmentText,
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

export function ScheduleAppointmentScreen({
  professionalId,
}: {
  professionalId:
    number | null;
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

  const professionalsQuery =
    useProfessionals();

  const typesQuery =
    useAppointmentTypes();

  const locationsQuery =
    useAppointmentLocations();

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      todayDateKey(),
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
    selectedTypeId,
    setSelectedTypeId,
  ] =
    useState<
      number | null
    >(
      null,
    );

  const [
    selectedLocationId,
    setSelectedLocationId,
  ] =
    useState<
      number | null
    >(
      null,
    );

  const [
    notes,
    setNotes,
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

  const professional =
    useMemo(
      () =>
        (
          professionalsQuery
            .data ?? []
        ).find(
          (
            item,
          ) =>
            item.id ===
            professionalId,
        ) ??
        null,
      [
        professionalsQuery
          .data,
        professionalId,
      ],
    );

  useEffect(
    () => {
      if (
        selectedTypeId !==
          null ||
        !typesQuery.data?.length
      ) {
        return;
      }

      const preferred =
        typesQuery.data.find(
          (
            type,
          ) =>
            normalizeAppointmentText(
              type.nombre,
            ) ===
            'presencial',
        ) ??
        typesQuery.data[0];

      setSelectedTypeId(
        preferred?.id ??
          null,
      );
    },
    [
      selectedTypeId,
      typesQuery.data,
    ],
  );

  const selectedType =
    useMemo(
      () =>
        (
          typesQuery.data ??
          []
        ).find(
          (
            item,
          ) =>
            item.id ===
            selectedTypeId,
        ) ??
        null,
      [
        selectedTypeId,
        typesQuery.data,
      ],
    );

  const physical =
    isPhysicalAppointmentType(
      selectedType,
    );

  useEffect(
    () => {
      if (!physical) {
        setSelectedLocationId(
          null,
        );
        return;
      }

      if (
        selectedLocationId ===
          null &&
        locationsQuery.data
          ?.length
      ) {
        setSelectedLocationId(
          locationsQuery
            .data[0]
            ?.id ??
            null,
        );
      }
    },
    [
      physical,
      selectedLocationId,
      locationsQuery.data,
    ],
  );

  const availabilityQuery =
    useAvailability(
      professionalId,
      selectedDate,
    );

  const {
    create,
  } =
    useAppointmentMutations(
      patientId,
    );

  useEffect(
    () => {
      setSelectedSlot(
        null,
      );
    },
    [
      selectedDate,
      professionalId,
    ],
  );

  if (
    patientId ===
      null ||
    !activePatient
  ) {
    return (
      <FullScreenState
        title="Selecciona un paciente"
        message="Necesitas un patientContext activo para agendar una cita."
      />
    );
  }

  if (
    professionalId ===
    null
  ) {
    return (
      <FullScreenState
        title="Profesional inválido"
        message="Selecciona nuevamente el especialista con quien deseas agendar."
        actionLabel="Buscar especialista"
        onAction={() =>
          router.replace(
            '/(app)/appointments/find-professional',
          )
        }
      />
    );
  }

  const submit =
    async () => {
      setErrorMessage(
        null,
      );

      if (!professional) {
        setErrorMessage(
          'No pudimos resolver el profesional seleccionado.',
        );
        return;
      }

      if (
        !selectedType
      ) {
        setErrorMessage(
          'Selecciona una modalidad.',
        );
        return;
      }

      if (
        !selectedSlot
      ) {
        setErrorMessage(
          'Selecciona un horario disponible.',
        );
        return;
      }

      if (
        physical &&
        selectedLocationId ===
          null
      ) {
        setErrorMessage(
          'Selecciona una ubicación para la cita presencial.',
        );
        return;
      }

      const parsedNotes =
        appointmentNotesSchema
          .safeParse(
            notes,
          );

      if (
        !parsedNotes.success
      ) {
        setErrorMessage(
          parsedNotes.error
            .issues[0]
            ?.message ??
            'Revisa el motivo de la consulta.',
        );
        return;
      }

      try {
        const appointment =
          await create.mutateAsync({
            paciente_id:
              patientId,
            profesional_id:
              professional.id,
            tipo_cita_id:
              selectedType.id,
            inicio:
              selectedSlot.inicio,
            fin:
              selectedSlot.fin,
            notas:
              parsedNotes.data ||
              null,
            ubicacion_id:
              physical
                ? selectedLocationId
                : null,
          });

        router.replace({
          pathname:
            '/(app)/appointments/confirmation',
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
            : 'No pudimos crear la cita. Intenta nuevamente.',
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
        title="Agendar Cita"
        subtitle={
          role ===
          'caregiver'
            ? `Paciente: ${activePatient.displayName}`
            : undefined
        }
        backFallbackHref="/(app)/appointments/find-professional"
      />

      <View className="gap-5 px-4 py-4">
        {professionalsQuery
          .isLoading ? (
          <SurfaceCard>
            <Text className="text-sm text-coal-500">
              Cargando especialista...
            </Text>
          </SurfaceCard>
        ) : professional ? (
          <SurfaceCard>
            <View className="flex-row items-center gap-4">
              <ProfessionalAvatar
                professional={
                  professional
                }
                size={66}
              />

              <View className="flex-1">
                <Text className="text-lg font-bold text-coal-900">
                  {professional.full_name}
                </Text>

                <Text className="mt-1 text-sm text-coal-500">
                  {professional.specialty}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <Text className="text-sm text-[#9D2C2C]">
              No pudimos resolver el profesional seleccionado.
            </Text>
          </SurfaceCard>
        )}

        <View className="gap-3">
          <Text className="text-xl font-bold text-coal-900">
            Selecciona una fecha
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
            Horas disponibles
          </Text>

          {availabilityQuery
            .isLoading ? (
            <Text className="text-sm text-coal-500">
              Consultando disponibilidad...
            </Text>
          ) : availabilityQuery
              .isError ? (
            <View className="gap-2 rounded-2xl bg-[#FFF4F4] p-4">
              <Text className="text-sm text-[#9D2C2C]">
                No pudimos consultar la disponibilidad.
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

        <View className="gap-3">
          <Text className="text-xl font-bold text-coal-900">
            Modalidad
          </Text>

          {typesQuery.isLoading ? (
            <Text className="text-sm text-coal-500">
              Cargando modalidades...
            </Text>
          ) : typesQuery.isError ? (
            <Text className="text-sm text-[#9D2C2C]">
              No pudimos cargar las modalidades disponibles.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {(typesQuery.data ??
                []).map(
                (
                  type,
                ) => {
                  const selected =
                    type.id ===
                    selectedTypeId;

                  return (
                    <Pressable
                      key={
                        type.id
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        setSelectedTypeId(
                          type.id,
                        )
                      }
                      className="min-h-11 min-w-[46%] flex-1 items-center justify-center rounded-xl border px-4"
                      style={{
                        borderColor:
                          selected
                            ? '#007B7F'
                            : '#D6DDE1',
                        backgroundColor:
                          selected
                            ? '#E7F4F4'
                            : '#FFFFFF',
                      }}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color:
                            selected
                              ? '#006A6D'
                              : '#4A565D',
                        }}
                      >
                        {type.nombre}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          )}
        </View>

        {physical ? (
          <View className="gap-3">
            <Text className="text-xl font-bold text-coal-900">
              Ubicación
            </Text>

            {locationsQuery
              .isLoading ? (
              <Text className="text-sm text-coal-500">
                Cargando ubicaciones...
              </Text>
            ) : (
              <View className="gap-2">
                {(locationsQuery
                  .data ?? []).map(
                  (
                    location,
                  ) => {
                    const selected =
                      location.id ===
                      selectedLocationId;

                    return (
                      <Pressable
                        key={
                          location.id
                        }
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                        }}
                        onPress={() =>
                          setSelectedLocationId(
                            location.id,
                          )
                        }
                        className="rounded-2xl border bg-white p-4"
                        style={{
                          borderColor:
                            selected
                              ? '#007B7F'
                              : '#DDE3E6',
                        }}
                      >
                        <View className="flex-row items-start gap-3">
                          <Ionicons
                            name="location-outline"
                            size={20}
                            color="#007B7F"
                          />

                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-coal-900">
                              {location.nombre}
                            </Text>

                            <Text className="mt-1 text-xs leading-5 text-coal-500">
                              {[
                                location.direccion,
                                location.consultorio,
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
                      </Pressable>
                    );
                  },
                )}

                {(locationsQuery
                  .data ?? [])
                  .length ===
                0 ? (
                  <View className="rounded-2xl bg-[#FFF4F4] p-4">
                    <Text className="text-sm text-[#9D2C2C]">
                      No hay ubicaciones presenciales disponibles.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-xl font-bold text-coal-900">
            Motivo de la consulta
          </Text>

          <TextInput
            value={
              notes
            }
            onChangeText={
              setNotes
            }
            placeholder="Ej. Chequeo anual, dolor en el pecho, etc. (Opcional)"
            placeholderTextColor="#8B949A"
            multiline
            maxLength={
              4000
            }
            textAlignVertical="top"
            className="min-h-28 rounded-2xl border border-coal-500/15 bg-white px-4 py-3 text-sm text-coal-900"
          />
        </View>

        {errorMessage ? (
          <View className="rounded-2xl bg-[#FFF0F0] p-4">
            <Text className="text-sm leading-5 text-[#A62A2A]">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View className="pb-5">
          <AppButton
            title="Confirmar cita"
            loading={
              create.isPending
            }
            disabled={
              !professional ||
              !selectedSlot ||
              !selectedType ||
              (physical &&
                selectedLocationId ===
                  null)
            }
            onPress={() => {
              void submit();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
