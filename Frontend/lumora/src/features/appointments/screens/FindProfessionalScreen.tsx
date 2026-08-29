import {
  useDeferredValue,
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
  ProfessionalCard,
} from '@/features/appointments/components/ProfessionalCard';
import {
  useProfessionals,
} from '@/features/appointments/hooks/useProfessionals';
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

export function FindProfessionalScreen() {
  const router =
    useRouter();

  const {
    activePatient,
  } =
    useShellContext();

  const [
    search,
    setSearch,
  ] =
    useState(
      '',
    );

  const [
    specialty,
    setSpecialty,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const deferredSearch =
    useDeferredValue(
      search,
    );

  const allProfessionals =
    useProfessionals();

  const filtered =
    useProfessionals({
      q:
        deferredSearch ||
        undefined,
      specialty:
        specialty ||
        undefined,
    });

  const specialties =
    useMemo(
      () =>
        Array.from(
          new Set(
            (
              allProfessionals
                .data ?? []
            )
              .map(
                (
                  professional,
                ) =>
                  professional.specialty.trim(),
              )
              .filter(
                Boolean,
              ),
          ),
        ).sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              'es',
            ),
        ),
      [
        allProfessionals
          .data,
      ],
    );

  if (
    !activePatient
  ) {
    return (
      <FullScreenState
        title="Selecciona un paciente"
        message="Necesitas un patientContext activo para agendar una cita."
      />
    );
  }

  return (
    <Screen
      scrollable
      keyboardAvoiding
      contentClassName="px-0 py-0"
    >
      <AppHeader
        title="Encontrar Especialista"
        subtitle="Busca por nombre o especialidad para agendar tu próxima cita."
        backFallbackHref="/(app)/(tabs)/appointments"
      />

      <View className="gap-5 px-4 py-4">
        <View className="flex-row items-center gap-2 rounded-xl border border-coal-500/15 bg-white px-3">
          <Ionicons
            name="search-outline"
            size={18}
            color="#7B848B"
          />

          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder="Ej. Cardiología, Dr. Rivera"
            placeholderTextColor="#8B949A"
            className="min-h-12 flex-1 text-sm text-coal-900"
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              onPress={() =>
                setSearch(
                  '',
                )
              }
              className="h-9 w-9 items-center justify-center"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#8B949A"
              />
            </Pressable>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-coal-700">
            Especialidad
          </Text>

          <View className="flex-row flex-wrap gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  specialty ===
                  null,
              }}
              onPress={() =>
                setSpecialty(
                  null,
                )
              }
              className="rounded-full px-4 py-2"
              style={{
                backgroundColor:
                  specialty ===
                  null
                    ? '#007B7F'
                    : '#E8EFF1',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  color:
                    specialty ===
                    null
                      ? '#FFFFFF'
                      : '#4A565D',
                }}
              >
                Todos
              </Text>
            </Pressable>

            {specialties.map(
              (
                item,
              ) => (
                <Pressable
                  key={
                    item
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected:
                      specialty ===
                      item,
                  }}
                  onPress={() =>
                    setSpecialty(
                      item,
                    )
                  }
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor:
                      specialty ===
                      item
                        ? '#007B7F'
                        : '#E8EFF1',
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        specialty ===
                        item
                          ? '#FFFFFF'
                          : '#4A565D',
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>

        {filtered.isLoading ? (
          <View className="rounded-2xl bg-[#EDF3F4] p-5">
            <Text className="text-sm text-coal-500">
              Buscando especialistas...
            </Text>
          </View>
        ) : filtered.isError ? (
          <View className="gap-3 rounded-2xl bg-[#FFF4F4] p-5">
            <Text className="text-sm text-[#9D2C2C]">
              No pudimos cargar los especialistas.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void filtered.refetch();
              }}
            >
              <Text className="text-sm font-semibold text-[#007B7F]">
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {(filtered.data ??
              []).length ===
            0 ? (
              <View className="rounded-2xl bg-[#EDF3F4] p-5">
                <Text className="text-center text-sm text-coal-500">
                  No encontramos especialistas con esos filtros.
                </Text>
              </View>
            ) : (
              (
                filtered.data ??
                []
              ).map(
                (
                  professional,
                ) => (
                  <ProfessionalCard
                    key={
                      professional.id
                    }
                    professional={
                      professional
                    }
                    onSelect={() =>
                      router.push({
                        pathname:
                          '/(app)/appointments/schedule',
                        params: {
                          professionalId:
                            String(
                              professional.id,
                            ),
                        },
                      })
                    }
                  />
                ),
              )
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
