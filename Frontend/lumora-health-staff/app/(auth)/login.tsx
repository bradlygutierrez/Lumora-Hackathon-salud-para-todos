import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { loginSchema, type LoginFormValues } from '@/src/features/auth/schemas/login.schema';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { env } from '@/src/application/config/env';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { LumoraBrand } from '@/src/shared/components/LumoraBrand';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, startPreviewSession } = useAuthSession();
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
      <View style={styles.container}>
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />
        <View style={styles.card}>
          <View style={styles.header}>
            <LumoraBrand />
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
                  secureTextEntry
                  value={value}
                />
              )}
            />
            <View style={styles.helperRow}>
              <View style={styles.toggle} />
              <Text style={styles.helper}>Recordar dispositivo</Text>
              <Link href="/(auth)/forgot-password" style={styles.recoveryLink}>
                ¿Olvidaste tu contraseña?
              </Link>
            </View>
            {errors.root?.message ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons color={theme.color.danger} name="warning" size={20} />
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
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.divider} />
            </View>
            <Button
              accessibilityLabel="Abrir desafío MFA"
              icon="shield-checkmark-outline"
              onPress={() => router.push('/(auth)/mfa-challenge')}
              variant="secondary"
            >
              Acceder con MFA
            </Button>
            {env.appEnvironment !== 'production' ? (
              <Button
                accessibilityLabel="Previsualizar pantallas clínicas"
                icon="eye-outline"
                onPress={startPreviewSession}
                variant="ghost"
              >
                Previsualizar pantallas
              </Button>
            ) : null}
            <View style={styles.links}>
              <Link href="/(auth)/mfa-challenge" style={styles.link}>
                Desafío MFA
              </Link>
              <Link href="/(auth)/verify-email" style={styles.link}>
                Verificar cuenta
              </Link>
            </View>
          </View>
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              Al iniciar sesion, aceptas nuestros Terminos de Servicio y Politica de Privacidad.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  decorTop: {
    backgroundColor: '#B0C6FF',
    borderRadius: theme.radius.pill,
    height: 195,
    position: 'absolute',
    right: -86,
    top: 10,
    width: 175,
  },
  decorBottom: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    bottom: 8,
    height: 55,
    left: -110,
    position: 'absolute',
    width: 234,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#F1F4FA',
    gap: theme.spacing.xs,
    paddingVertical: 20,
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
    padding: theme.spacing.xl,
  },
  helperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  toggle: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    width: 24,
  },
  helper: {
    color: theme.color.mutedText,
    flex: 1,
    fontSize: theme.typography.caption,
  },
  recoveryLink: {
    color: theme.color.primaryPressed,
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    textAlign: 'right',
  },
  errorBox: {
    backgroundColor: theme.color.dangerSoft,
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 4,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  errorContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  errorTitle: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  divider: {
    backgroundColor: theme.color.softBorder,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: theme.color.mutedText,
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
  legalFooter: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
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
