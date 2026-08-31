import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/shared/components/Screen';
import { AppHeader } from '@/shared/components/AppHeader';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';

function accessLevelLabel(accessLevel: string | null): string {
  switch (accessLevel) {
    case 'write':
      return 'Acceso completo (lectura y escritura)';
    case 'read':
      return 'Acceso de solo lectura';
    default:
      return 'Nivel de acceso no especificado';
  }
}

/**
 * Selector de patientContext para cuidadores.
 *
 * Esta pantalla NO depende de que ya exista
 * un paciente activo.
 */
export default function SelectPatientRoute() {
  const { role, activePatient, availablePatients, switchPatient, errorMessage } =
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
    router.replace('/(app)/(tabs)/profile');
  };

  if (role !== 'caregiver') {
    return (
      <Screen contentClassName="px-0 py-0">
        <AppHeader
          title="Familiares"
          subtitle="Esta pantalla está disponible solo para cuidadores."
          onBackPress={handleBackPress}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader
        title="Familiares Autorizados"
        subtitle="Gestiona los pacientes vinculados y selecciona el contexto activo."
        onBackPress={handleBackPress}
      />

      <View className="gap-4 px-4 py-4">
        {errorMessage ? (
          <SurfaceCard className="bg-[#fff0ef]">
            <Text className="text-sm text-coal-900">{errorMessage}</Text>
          </SurfaceCard>
        ) : null}

        {availablePatients.length === 0 ? (
          <SurfaceCard>
            <Text className="text-base font-semibold text-coal-900">
              No hay pacientes disponibles
            </Text>

            <Text className="mt-2 text-sm text-coal-500">
              No tienes relaciones activas o el backend de relaciones aún no está disponible.
            </Text>
          </SurfaceCard>
        ) : null}

        {availablePatients.map((patient) => {
          const isActive = activePatient?.patientId === patient.patientId;

          return (
            <SurfaceCard key={patient.patientId}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-1">
                  <Text className="text-xl font-semibold text-coal-900">
                    {patient.displayName}
                  </Text>

                  <Text className="text-sm text-coal-500">
                    {patient.relationship ?? 'Paciente vinculado'}
                  </Text>
                </View>

                {isActive ? (
                  <View className="rounded-full bg-[#0F7B83] px-3 py-1">
                    <Text className="text-xs font-semibold text-white">Activo</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-4 gap-1">
                <Text className="text-sm text-coal-500">
                  {accessLevelLabel(patient.accessLevel)}
                </Text>
              </View>

              <Pressable
                className="mt-4 rounded-2xl bg-[#0F7B83] px-4 py-3 active:opacity-80"
                onPress={() => {
                  const allowed = switchPatient(patient.patientId);

                  if (allowed) {
                    router.replace('/(app)/(tabs)/health');
                  }
                }}
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Ver como paciente activo
                </Text>
              </Pressable>
            </SurfaceCard>
          );
        })}
      </View>
    </Screen>
  );
}
