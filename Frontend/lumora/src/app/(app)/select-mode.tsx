import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { SurfaceCard } from '@/shared/components/SurfaceCard';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import type {
  SelectableLumoraRole,
} from '@/features/shell/types/shell.types';

type ModeCardProps = {
  title: string;
  description: string;
  disabled: boolean;
  onPress: () => void;
};

function ModeCard({
  title,
  description,
  disabled,
  onPress,
}: ModeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      className="min-h-28 active:opacity-80 disabled:opacity-50"
      onPress={onPress}
    >
      <SurfaceCard className="h-full border border-bone-500">
        <Text className="text-lg font-bold text-coal-900">
          {title}
        </Text>
        <Text className="mt-2 text-sm leading-5 text-coal-600">
          {description}
        </Text>
      </SurfaceCard>
    </Pressable>
  );
}

/**
 * B14: selector explícito para cuentas que tienen simultáneamente
 * los roles Paciente y Cuidador.
 */
export default function SelectModeRoute() {
  const { role, switchRole, errorMessage } = useShellContext();
  const [loadingRole, setLoadingRole] =
    useState<SelectableLumoraRole | null>(null);

  const selectMode = async (nextRole: SelectableLumoraRole) => {
    setLoadingRole(nextRole);
    const success = await switchRole(nextRole);
    setLoadingRole(null);

    if (!success) {
      return;
    }

    if (nextRole === 'caregiver') {
      router.replace('/(app)/select-patient');
      return;
    }

    router.replace('/(app)/(tabs)/health');
  };

  if (role !== 'dual' && role !== null) {
    return (
      <Screen contentClassName="justify-center gap-4">
        <Text className="text-xl font-bold text-coal-900">
          Modo de cuenta
        </Text>
        <Text className="text-base text-coal-500">
          Tu cuenta no necesita seleccionar un modo.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-6">
      <AppHeader
        title="¿Cómo querés usar Lumora?"
        subtitle="Tu cuenta tiene acceso como paciente y como cuidador."
      />

      <View className="gap-4 px-4">
        {errorMessage ? (
          <Text accessibilityRole="alert" className="text-sm text-coal-900">
            {errorMessage}
          </Text>
        ) : null}

        <ModeCard
          title="Usar como paciente"
          description="Abre tu propio perfil de salud, medicamentos, citas y datos personales."
          disabled={loadingRole !== null}
          onPress={() => void selectMode('patient')}
        />

        <ModeCard
          title="Usar como cuidador"
          description="Selecciona uno de los pacientes que te haya autorizado."
          disabled={loadingRole !== null}
          onPress={() => void selectMode('caregiver')}
        />

        <Text className="text-center text-xs leading-5 text-coal-500">
          El modo elegido solo cambia el contexto de esta sesión. Las autorizaciones
          siguen siendo validadas por el backend.
        </Text>
      </View>
    </Screen>
  );
}
