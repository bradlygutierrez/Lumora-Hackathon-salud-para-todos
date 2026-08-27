import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { VerificationCodeInput } from '@/features/auth/components/VerificationCodeInput';
import {
  mfaSchema,
  type MfaForm,
} from '@/features/auth/schemas/auth.schemas';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

/** Segunda etapa del login cuando FastAPI responde `mfa_required: true`. */
export default function MfaLoginRoute() {
  const pendingMfa = useAuthStore((state) => state.pendingMfa);
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const verify = useMutation({
    mutationFn: (code: string) => {
      if (!pendingMfa) {
        throw new Error('No hay desafío MFA activo.');
      }

      return authApi.verifyMfa(pendingMfa.challengeToken, code);
    },
    onSuccess: async (session) => {
      await setSession(session);
      router.replace('/(app)/(tabs)');
    },
  });

  if (!pendingMfa) {
    return (
      <Screen contentClassName="justify-center gap-4">
        <Text className="text-xl font-bold text-coal-900">
          Desafío MFA no disponible
        </Text>
        <Text className="text-base text-coal-500">
          Inicia sesión nuevamente para generar un desafío válido.
        </Text>
        <AppButton
          title="Volver al login"
          onPress={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="justify-center gap-7">
      <AuthHeader
        title="Verificación en dos pasos"
        subtitle="Abre tu app de autenticación e ingresa el código TOTP de 6 dígitos."
      />

      <View className="rounded-xl bg-lumen-300 p-4">
        <Text className="text-sm leading-5 text-coal-700">
          Método soportado: App de autenticación. SMS no está habilitado. El
          desafío expira en aproximadamente {Math.ceil(pendingMfa.expiresIn / 60)}
          {' '}minuto(s).
        </Text>
      </View>

      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <View className="gap-2">
            <VerificationCodeInput
              value={field.value}
              onChange={field.onChange}
            />
            {fieldState.error ? (
              <Text className="text-xs font-medium text-coal-900">
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {verify.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {verify.error instanceof ApiError
            ? verify.error.message
            : 'Código inválido.'}
        </Text>
      ) : null}

      <AppButton
        title="Verificar identidad"
        loading={verify.isPending}
        onPress={form.handleSubmit((values) => verify.mutate(values.code))}
      />
    </Screen>
  );
}
