import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useShellContext,
} from '@/features/shell/hooks/useShellContext';

export function PatientContextBanner() {
  const insets = useSafeAreaInsets();

  const {
    role,
    activePatient,
    availablePatients,
  } = useShellContext();

  if (
    role !== 'caregiver' ||
    !activePatient
  ) {
    return null;
  }

  const canChangePatient =
    availablePatients.length > 1;

  return (
    <View
      className="px-4"
      style={{
        marginTop: insets.top + 8,
      }}
    >
      <View className="rounded-2xl border border-lumen-500/20 bg-white px-4 py-4 shadow-sm">
        <View className="flex-row items-center">
          {/* Indicador visual */}
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-lumen-300">
            <Text className="text-base font-bold text-coal-900">
              {activePatient.displayName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          {/* Información */}
          <View className="flex-1">
            <Text className="text-xs font-medium text-coal-500">
              Viendo información de
            </Text>

            <Text
              className="mt-0.5 text-base font-semibold text-coal-900"
              numberOfLines={1}
            >
              {activePatient.displayName}
            </Text>
          </View>

          {/* Cambio de paciente */}
          {canChangePatient ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar paciente"
              hitSlop={8}
              onPress={() => {
                router.push(
                  '/(app)/select-patient',
                );
              }}
              className="ml-3 rounded-full border border-lumen-500/30 bg-lumen-300 px-4 py-2 active:opacity-70"
            >
              <Text className="text-sm font-semibold text-coal-900">
                Cambiar
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}