import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  loginSchema,
  type LoginFormValues,
} from '@/src/features/auth/schemas/login.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { LumoraBrand } from '@/src/shared/components/LumoraBrand';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [passwordHidden, setPasswordHidden] = useState(true);
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
      const outcome = await signIn(values);
      if (outcome === 'mfa_required') {
        router.push('/(auth)/mfa-challenge');
      }
    } catch (error) {
      const apiError = toApiError(error);
      setError('root', { message: apiError.message });
    }
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.viewport}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <LumoraBrand stacked />
            <Text style={styles.subtitle}>Acceso Seguro al Sistema</Text>
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
                  icon="person-outline"
                  label="Usuario o Correo electrónico"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="clinician@lumora.med"
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
                  icon="lock-closed-outline"
                  label="Contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onRightIconPress={() => setPasswordHidden((current) => !current)}
                  rightAccessibilityLabel={
                    passwordHidden ? 'Mostrar contraseña' : 'Ocultar contraseña'
                  }
                  rightIcon={passwordHidden ? 'eye-off-outline' : 'eye-outline'}
                  secureTextEntry={passwordHidden}
                  value={value}
                />
              )}
            />

            <View style={styles.recoveryRow}>
              <Link href="/(auth)/forgot-password" style={styles.recoveryLink}>
                ¿Olvidaste tu contraseña?
              </Link>
            </View>

            {errors.root?.message ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <View style={styles.errorIcon}>
                  <Ionicons color={theme.color.danger} name="warning" size={24} />
                </View>
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>Error de autenticación</Text>
                  <Text style={styles.error}>{errors.root.message}</Text>
                </View>
              </View>
            ) : null}

            <Button
              accessibilityLabel="Iniciar sesión clínica"
              icon="log-in-outline"
              loading={isSubmitting}
              onPress={onSubmit}
            >
              Entrar
            </Button>

            <View style={styles.securityHint}>
              <Ionicons
                color={theme.color.primaryPressed}
                name="shield-checkmark-outline"
                size={18}
              />
              <Text style={styles.securityText}>
                Si tu cuenta tiene MFA activo, continuaremos automáticamente con
                la verificación de seguridad.
              </Text>
            </View>
          </View>

          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              Acceso exclusivo para personal autorizado de Lumora.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 560,
    overflow: 'hidden',
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderBottomColor: theme.color.softBorder,
    borderBottomWidth: 1,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 30,
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: 18,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 28,
  },
  recoveryRow: {
    alignItems: 'flex-end',
  },
  recoveryLink: {
    color: theme.color.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: theme.color.dangerSoft,
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 5,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  errorIcon: {
    paddingTop: 2,
  },
  errorContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  errorTitle: {
    color: theme.color.dangerText,
    fontSize: 15,
    fontWeight: '900',
  },
  error: {
    color: theme.color.dangerText,
    fontSize: 14,
    lineHeight: 21,
  },
  securityHint: {
    alignItems: 'flex-start',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  securityText: {
    color: theme.color.mutedText,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  legalFooter: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  legalText: {
    color: theme.color.subtleText,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
