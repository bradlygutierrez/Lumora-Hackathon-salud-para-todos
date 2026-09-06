import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { PasswordRequirements } from '@/features/auth/components/PasswordRequirements';
import {
  changePasswordSchema,
  type ChangePasswordForm,
} from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

/** Cambio de contraseña dedicado; nunca usa PATCH genérico de Usuario. */
export default function ChangePasswordRoute() {
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');

  const changePassword = useMutation({
    mutationFn: (values: ChangePasswordForm) =>
      authApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => form.reset(),
  });

  return (
    <Screen scrollable contentClassName="gap-5">
      <Text className="text-3xl font-bold text-coal-900">
        Cambiar contraseña
      </Text>

      <Controller
        control={form.control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Contraseña actual"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

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

      {changePassword.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {changePassword.error instanceof ApiError
            ? changePassword.error.message
            : 'No fue posible cambiar la contraseña.'}
        </Text>
      ) : null}

      {changePassword.data ? (
        <Text className="text-sm text-coal-500">
          {changePassword.data.message}
        </Text>
      ) : null}

      <AppButton
        title="Actualizar contraseña"
        loading={changePassword.isPending}
        onPress={form.handleSubmit((values) => changePassword.mutate(values))}
      />
    </Screen>
  );
}
