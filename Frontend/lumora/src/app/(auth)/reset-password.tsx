import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { PasswordRequirements } from '@/features/auth/components/PasswordRequirements';
import {
  resetPasswordSchema,
  type ResetPasswordForm,
} from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/**
 * Reset de contraseña.
 *
 * En producción el token debe llegar en el deep link del correo. Si se abre
 * manualmente la pantalla sin token, mostramos un input de diagnóstico para
 * no dejar una ruta imposible de usar durante el hackathon.
 */
export default function ResetPasswordRoute() {
  const params = useLocalSearchParams<{ token?: string }>();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: params.token ?? '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');

  const reset = useMutation({
    mutationFn: (values: ResetPasswordForm) =>
      authApi.resetPassword(values.token, values.newPassword),
    onSuccess: () => router.replace('/(auth)/login'),
  });

  return (
    <Screen scrollable contentClassName="justify-center gap-6">
      <AuthHeader
        title="Restablecer contraseña"
        subtitle="Define una contraseña nueva para Lumora."
      />

      {!params.token ? (
        <FormTextField
          control={form.control}
          name="token"
          label="Token de recuperación"
          autoCapitalize="none"
        />
      ) : null}

      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Nueva contraseña"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <PasswordRequirements value={newPassword} />

      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Confirmar nueva contraseña"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      {reset.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {reset.error instanceof ApiError
            ? reset.error.message
            : 'No fue posible actualizar la contraseña.'}
        </Text>
      ) : null}

      <AppButton
        title="Actualizar contraseña"
        loading={reset.isPending}
        onPress={form.handleSubmit((values) => reset.mutate(values))}
      />
    </Screen>
  );
}
