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
      className="min-h-12 flex-row items-start gap-3"
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

export default function RegisterReviewRoute() {
  const accountType = useRegistrationStore((state) => state.accountType);
  const account = useRegistrationStore((state) => state.account);
  const personal = useRegistrationStore((state) => state.personal);
  const emergency = useRegistrationStore((state) => state.emergency);
  const buildPatientRequest = useRegistrationStore(
    (state) => state.buildPatientRequest,
  );
  const buildCaregiverRequest = useRegistrationStore(
    (state) => state.buildCaregiverRequest,
  );
  const resetRegistration = useRegistrationStore((state) => state.reset);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const registrationIsComplete =
    accountType !== null &&
    account !== null &&
    personal !== null &&
    (accountType === 'caregiver' || emergency !== null);

  const register = useMutation({
    mutationFn: () => {
      if (accountType === 'caregiver') {
        return authApi.registerCaregiver(
          buildCaregiverRequest(true, true),
        );
      }

      return authApi.register(
        buildPatientRequest(true, true),
      );
    },
    onSuccess: () => {
      const email = account?.email ?? '';
      resetRegistration();
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email },
      });
    },
  });

  if (!registrationIsComplete || accountType === null || !account || !personal) {
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
          onPress={() => router.replace('/(auth)/register')}
        />
      </Screen>
    );
  }

  const isCaregiver = accountType === 'caregiver';
  const total = isCaregiver ? 3 : 4;

  return (
    <Screen scrollable contentClassName="gap-6">
      <AuthHeader
        title="Revisión y Confirmación"
        subtitle={
          isCaregiver
            ? 'Revisa los datos de tu cuenta cuidadora.'
            : 'Revisa tus datos antes de crear la cuenta.'
        }
      />
      <RegistrationProgress step={total} total={total} />

      <View className="gap-4 rounded-2xl bg-bone-300 p-4">
        <Text className="font-bold text-coal-900">Tipo de cuenta</Text>
        <Text className="leading-6 text-coal-700">
          {isCaregiver ? 'Cuidador' : 'Paciente'}
        </Text>

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

        {!isCaregiver && emergency ? (
          <>
            <Text className="font-bold text-coal-900">
              Contacto de emergencia
            </Text>
            <Text className="leading-6 text-coal-700">
              {emergency.name}{'\n'}
              {emergency.relationship}{'\n'}
              {emergency.phone}
            </Text>
          </>
        ) : null}

        {isCaregiver ? (
          <Text className="text-sm leading-5 text-coal-500">
            Tu cuenta no tendrá acceso a pacientes hasta que uno de ellos te
            autorice como familiar/cuidador.
          </Text>
        ) : null}
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
