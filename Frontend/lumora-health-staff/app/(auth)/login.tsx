import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { loginSchema, type LoginFormValues } from '@/src/features/auth/schemas/login.schema';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuthSession();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values);
    } catch (error) {
      const apiError = toApiError(error);
      setError('root', { message: apiError.message });
    }
  });

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Lumora Health Staff</Text>
          <Text style={styles.title}>Acceso clínico</Text>
          <Text style={styles.subtitle}>Ingresa con tu usuario autorizado.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="login"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="username"
                error={errors.login?.message}
                label="Usuario o correo"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoComplete="password"
                error={errors.password?.message}
                label="Contraseña"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                value={value}
              />
            )}
          />
          {errors.root?.message ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errors.root.message}
            </Text>
          ) : null}
          <Button
            accessibilityLabel="Iniciar sesión clínica"
            loading={isSubmitting}
            onPress={onSubmit}
          >
            Iniciar sesión
          </Button>
          <View style={styles.links}>
            <Link href="/(auth)/mfa-challenge" style={styles.link}>
              Desafío MFA
            </Link>
            <Link href="/(auth)/forgot-password" style={styles.link}>
              Recuperar acceso
            </Link>
            <Link href="/(auth)/verify-email" style={styles.link}>
              Verificar cuenta
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.color.primary,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  form: {
    gap: theme.spacing.lg,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
  },
  links: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  link: {
    color: theme.color.text,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
});
