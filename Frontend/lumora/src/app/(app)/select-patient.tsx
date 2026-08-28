import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  Screen,
} from '@/shared/components/Screen';

import {
  AppHeader,
} from '@/shared/components/AppHeader';

import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

/**
 * Selector de patientContext para cuidadores.
 *
 * Esta pantalla NO depende de que ya exista
 * un paciente activo.
 */
export default function SelectPatientRoute() {
  const {
    role,
    availablePatients,
    switchPatient,
    errorMessage,
  } =
    useShellContext();

  /**
   * No utilizamos router.back() directamente.
   *
   * Cuando el caregiver llega aquí automáticamente
   * porque tiene status=needs-patient, la pantalla
   * anterior normalmente es una ruta patient-scoped.
   *
   * Volver a ella provocaría:
   *
   * select-patient
   * -> back
   * -> patient route
   * -> guard
   * -> select-patient
   *
   * Por eso Perfil es el destino seguro.
   */
  const handleBackPress = () => {
    router.replace(
      '/(app)/(tabs)/profile',
    );
  };

  if (
    role !==
    'caregiver'
  ) {
    return (
      <Screen
        contentClassName="px-0 py-0"
      >
        <AppHeader
          title="Familiares"
          subtitle="Esta pantalla está disponible solo para cuidadores."
          onBackPress={
            handleBackPress
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      <AppHeader
        title="Familiares Autorizados"
        subtitle="Gestiona los pacientes vinculados y selecciona el contexto activo."
        onBackPress={
          handleBackPress
        }
      />

      <View className="gap-4 px-4 py-4">
        <Pressable className="self-start rounded-full bg-[#78AEDD] px-4 py-3 active:opacity-80">
          <Text className="text-sm font-semibold text-white">
            + Añadir Familiar
          </Text>
        </Pressable>

        {errorMessage ? (
          <SurfaceCard className="bg-[#fff0ef]">
            <Text className="text-sm text-coal-900">
              {errorMessage}
            </Text>
          </SurfaceCard>
        ) : null}

        {availablePatients.length ===
        0 ? (
          <SurfaceCard>
            <Text className="text-base font-semibold text-coal-900">
              No hay pacientes disponibles
            </Text>

            <Text className="mt-2 text-sm text-coal-500">
              No tienes relaciones activas o el backend de relaciones aún no está disponible.
            </Text>
          </SurfaceCard>
        ) : null}

        {availablePatients.map(
          (
            patient,
            index,
          ) => (
            <SurfaceCard
              key={
                patient.patientId
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-xl font-semibold text-coal-900">
                    {
                      patient.displayName
                    }
                  </Text>

                  <Text className="text-sm text-coal-500">
                    {patient.relationship ??
                      'Paciente vinculado'}
                  </Text>
                </View>

                <Text className="text-coal-500">
                  ⋮
                </Text>
              </View>

              <View className="mt-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-coal-500">
                    Recibe alertas críticas
                  </Text>

                  <View
                    className={`h-6 w-11 rounded-full ${
                      index % 2 ===
                      0
                        ? 'bg-[#78AEDD]'
                        : 'bg-[#c9d5de]'
                    }`}
                  >
                    <View
                      className={`mt-0.5 h-5 w-5 rounded-full bg-white ${
                        index % 2 ===
                        0
                          ? 'ml-5'
                          : 'ml-0.5'
                      }`}
                    />
                  </View>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-coal-500">
                    Acceso a expediente
                  </Text>

                  <View
                    className={`h-6 w-11 rounded-full ${
                      index === 0
                        ? 'bg-[#78AEDD]'
                        : 'bg-[#c9d5de]'
                    }`}
                  >
                    <View
                      className={`mt-0.5 h-5 w-5 rounded-full bg-white ${
                        index === 0
                          ? 'ml-5'
                          : 'ml-0.5'
                      }`}
                    />
                  </View>
                </View>
              </View>

              <Pressable
                className="mt-4 rounded-2xl bg-[#0F7B83] px-4 py-3 active:opacity-80"
                onPress={() => {
                  const allowed =
                    switchPatient(
                      patient.patientId,
                    );

                  if (allowed) {
                    router.replace(
                      '/(app)/(tabs)/health',
                    );
                  }
                }}
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Ver como paciente activo
                </Text>
              </Pressable>
            </SurfaceCard>
          ),
        )}
      </View>
    </Screen>
  );
}