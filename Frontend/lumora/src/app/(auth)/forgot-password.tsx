import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import {
  forgotPasswordSchema,
  type ForgotPasswordForm,
} from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/** Backend siempre responde de forma genérica para evitar enumeración de cuentas. */
export default function ForgotPasswordRoute() {
  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const requestRecovery = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });

  return (
    <Screen contentClassName="justify-center gap-7">
      <AuthHeader
        title="Recuperar contraseña"
        subtitle="Te enviaremos instrucciones a tu correo."
      />

      <View className="gap-4">
        <FormTextField
          control={form.control}
          name="email"
          label="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {requestRecovery.error ? (
          <Text accessibilityRole="alert" className="text-sm text-coal-900">
            {requestRecovery.error instanceof ApiError
              ? requestRecovery.error.message
              : 'No fue posible enviar el correo.'}
          </Text>
        ) : null}

        {requestRecovery.data ? (
          <Text className="text-sm leading-5 text-coal-500">
            {requestRecovery.data.message}
          </Text>
        ) : null}

        <AppButton
          title="Enviar enlace"
          loading={requestRecovery.isPending}
          onPress={form.handleSubmit((values) =>
            requestRecovery.mutate(values.email),
          )}
        />

        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link">
            <Text className="text-center font-medium text-coal-700">
              Volver al inicio de sesión
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
