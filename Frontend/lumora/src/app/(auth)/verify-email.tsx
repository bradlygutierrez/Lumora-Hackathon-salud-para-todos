import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { VerificationCodeInput } from '@/features/auth/components/VerificationCodeInput';
import {
  verifyEmailSchema,
  type VerifyEmailForm,
} from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

/**
 * Verificación B08 por código de 6 dígitos.
 *
 * El email viaja como route param desde el registro; el código nunca se
 * persiste. Backend aplica expiración, single-use y cooldown de resend.
 */
export default function VerifyEmailRoute() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const form = useForm<VerifyEmailForm>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
  });

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyEmail(email, code),
    onSuccess: () => router.replace('/(auth)/login'),
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(email),
  });

  return (
    <Screen contentClassName="justify-center gap-7">
      <AuthHeader
        title="Verifica tu correo"
        subtitle={`Escribe el código de 6 dígitos enviado a ${
          email || 'tu correo'
        }.`}
      />

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
        title="Verificar código"
        loading={verify.isPending}
        disabled={!email}
        onPress={form.handleSubmit((values) => verify.mutate(values.code))}
      />

      <AppButton
        variant="ghost"
        title={resend.isPending ? 'Reenviando...' : 'Reenviar código'}
        disabled={!email || resend.isPending}
        onPress={() => resend.mutate()}
      />

      {resend.data ? (
        <Text className="text-center text-sm text-coal-500">
          {resend.data.message}
        </Text>
      ) : null}

      {resend.error ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-coal-900">
          {resend.error instanceof ApiError
            ? resend.error.message
            : 'No fue posible reenviar el código.'}
        </Text>
      ) : null}
    </Screen>
  );
}
