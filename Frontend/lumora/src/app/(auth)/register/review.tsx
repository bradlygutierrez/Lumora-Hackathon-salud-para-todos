import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { RegistrationProgress } from '@/features/auth/components/RegistrationProgress';
import { useRegistrationStore } from '@/features/auth/store/registration-store';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

type AgreementProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

function Agreement({ checked, label, onPress }: AgreementProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      className="flex-row items-start gap-3"
    >
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border border-lumen-500 ${
          checked ? 'bg-lumen-500' : 'bg-bone-100'
        }`}
      >
        {checked ? <Text>✓</Text> : null}
      </View>
      <Text className="flex-1 text-sm leading-5 text-coal-700">{label}</Text>
    </Pressable>
  );
}

/**
 * Paso 4 de 4.
 *
 * Esta es la PRIMERA pantalla que llama al backend. `buildRequest()` reúne
 * todos los pasos y FastAPI crea las entidades en una sola transacción.
 */
export default function RegisterReviewRoute() {
  const account = useRegistrationStore((state) => state.account);
  const personal = useRegistrationStore((state) => state.personal);
  const emergency = useRegistrationStore((state) => state.emergency);
  const buildRequest = useRegistrationStore((state) => state.buildRequest);
  const resetRegistration = useRegistrationStore((state) => state.reset);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const register = useMutation({
    mutationFn: () => authApi.register(buildRequest(true, true)),
    onSuccess: () => {
      const email = account?.email ?? '';
      resetRegistration();
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email },
      });
    },
  });

  /**
   * Si el usuario llega por deep link o refresh sin pasos previos, no enviamos
   * datos incompletos. Lo regresamos al inicio del wizard.
   */
  if (!account || !personal || !emergency) {
    return (
      <Screen contentClassName="justify-center gap-4">
        <Text className="text-xl font-bold text-coal-900">
          Registro incompleto
        </Text>
        <Text className="text-base text-coal-500">
          Vuelve al primer paso para completar la información requerida.
        </Text>
        <AppButton
          title="Volver a empezar"
          onPress={() => router.replace('/(auth)/register/account')}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable contentClassName="gap-6">
      <AuthHeader
        title="Revisión y Confirmación"
        subtitle="Revisa tus datos antes de crear la cuenta."
      />
      <RegistrationProgress step={4} />

      <View className="gap-4 rounded-2xl bg-bone-300 p-4">
        <Text className="font-bold text-coal-900">Cuenta</Text>
        <Text className="leading-6 text-coal-700">
          {account.username}{'\n'}
          {account.email}{'\n'}
          {account.phone}
        </Text>

        <Text className="font-bold text-coal-900">Información personal</Text>
        <Text className="leading-6 text-coal-700">
          {personal.firstNames} {personal.lastNames}{'\n'}
          {personal.birthDate}{'\n'}
          {personal.addressLine1}
        </Text>

        <Text className="font-bold text-coal-900">
          Contacto de emergencia
        </Text>
        <Text className="leading-6 text-coal-700">
          {emergency.name}{'\n'}
          {emergency.relationship}{'\n'}
          {emergency.phone}
        </Text>
      </View>

      <Agreement
        checked={acceptTerms}
        label="Acepto los Términos y Condiciones"
        onPress={() => setAcceptTerms((value) => !value)}
      />
      <Agreement
        checked={acceptPrivacy}
        label="Acepto la Política de Privacidad"
        onPress={() => setAcceptPrivacy((value) => !value)}
      />

      {register.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {register.error instanceof ApiError
            ? register.error.message
            : 'No fue posible crear la cuenta.'}
        </Text>
      ) : null}

      <AppButton
        title="Confirmar y Crear Cuenta"
        loading={register.isPending}
        disabled={!acceptTerms || !acceptPrivacy}
        onPress={() => {
          if (!acceptTerms || !acceptPrivacy) return;
          register.mutate();
        }}
      />
    </Screen>
  );
}
