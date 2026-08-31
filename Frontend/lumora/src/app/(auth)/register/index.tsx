import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AuthHeader } from '@/features/auth/components/AuthHeader';
import {
  type RegistrationAccountType,
  useRegistrationStore,
} from '@/features/auth/store/registration-store';
import { Screen } from '@/shared/components/Screen';

type AccountTypeOptionProps = {
  title: string;
  description: string;
  onPress: () => void;
};

function AccountTypeOption({
  title,
  description,
  onPress,
}: AccountTypeOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="rounded-3xl border border-coal-500/10 bg-white p-5 active:opacity-80"
      style={{
        minHeight: 120,
      }}
    >
      <Text className="text-xl font-bold text-coal-900">
        {title}
      </Text>

      <Text className="mt-2 text-sm leading-5 text-coal-600">
        {description}
      </Text>

      <View className="mt-4 self-start rounded-full bg-lumen-500 px-4 py-2">
        <Text className="text-sm font-semibold text-white">
          Seleccionar
        </Text>
      </View>
    </Pressable>
  );
}

export default function RegisterTypeRoute() {
  const setAccountType = useRegistrationStore(
    (state) => state.setAccountType,
  );

  const chooseType = (
    accountType: RegistrationAccountType,
  ) => {
    setAccountType(accountType);

    router.push(
      '/(auth)/register/account',
    );
  };

  return (
    <Screen
      scrollable
      contentClassName="gap-6"
    >
      <AuthHeader
        title="Crear cuenta"
        subtitle="Selecciona cómo vas a usar Lumora."
      />

      <View className="gap-4">
        <AccountTypeOption
          title="Soy paciente"
          description="Gestiona tu salud, medicamentos, citas y familiares autorizados."
          onPress={() => {
            chooseType('patient');
          }}
        />

        <AccountTypeOption
          title="Soy cuidador"
          description="Acompaña a pacientes que te autoricen y consulta la información disponible según tus permisos."
          onPress={() => {
            chooseType('caregiver');
          }}
        />

        <View className="rounded-2xl bg-bone-300 p-4">
          <Text className="text-sm leading-5 text-coal-600">
            Una cuenta de cuidador no obtiene acceso automático a ningún paciente.
            Cada paciente debe vincularte y autorizarte desde su propia cuenta.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
