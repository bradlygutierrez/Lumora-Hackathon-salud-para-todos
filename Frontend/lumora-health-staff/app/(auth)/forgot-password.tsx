import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { forgotPassword, resetPassword } from '@/src/features/auth/api/auth.api';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '@/src/features/auth/schemas/recovery.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function ForgotPasswordScreen() {
  const requestForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: '', new_password: '' },
  });

  const requestAccess = requestForm.handleSubmit(async (values) => {
    try {
      const response = await forgotPassword(values);
      requestForm.setError('root', { message: response.message });
    } catch (error) {
      requestForm.setError('root', { message: toApiError(error).message });
    }
  });

  const resetAccess = resetForm.handleSubmit(async (values) => {
    try {
      const response = await resetPassword(values);
      resetForm.setError('root', { message: response.message });
    } catch (error) {
      resetForm.setError('root', { message: toApiError(error).message });
    }
  });

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar acceso</Text>
          <Link href="/(auth)/login" style={styles.link}>
            Volver a inicio de sesión
          </Link>
        </View>

        <View style={styles.card}>
          <Controller
            control={requestForm.control}
            name="email"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                error={requestForm.formState.errors.email?.message}
                keyboardType="email-address"
                label="Correo"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {requestForm.formState.errors.root?.message ? (
            <Text style={styles.message}>{requestForm.formState.errors.root.message}</Text>
          ) : null}
          <Button loading={requestForm.formState.isSubmitting} onPress={requestAccess}>
            Enviar recuperación
          </Button>
        </View>

        <View style={styles.card}>
          <Controller
            control={resetForm.control}
            name="token"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                error={resetForm.formState.errors.token?.message}
                label="Código de recuperación"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Controller
            control={resetForm.control}
            name="new_password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoComplete="new-password"
                error={resetForm.formState.errors.new_password?.message}
                label="Nueva contraseña"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                value={value}
              />
            )}
          />
          {resetForm.formState.errors.root?.message ? (
            <Text style={styles.message}>{resetForm.formState.errors.root.message}</Text>
          ) : null}
          <Button loading={resetForm.formState.isSubmitting} onPress={resetAccess}>
            Actualizar contraseña
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  link: {
    color: theme.color.text,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
});
