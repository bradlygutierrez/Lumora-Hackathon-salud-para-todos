import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  recoverMfaChallenge,
  verifyMfaChallenge,
} from '@/src/features/auth/api/auth.api';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  mfaRecoverySchema,
  mfaVerifySchema,
  type MfaRecoveryFormValues,
  type MfaVerifyFormValues,
} from '@/src/features/auth/schemas/mfa.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { CodeBoxes } from '@/src/shared/components/CodeBoxes';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

function methodLabel(method: string | null | undefined) {
  if (method === 'email') return 'Correo electrónico';
  if (method === 'totp') return 'Aplicación de autenticación';
  return 'Método MFA configurado';
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function MfaChallengeScreen() {
  const { completeTokenSignIn, pendingMfa } = useAuthSession();
  const [secondsLeft, setSecondsLeft] = useState(pendingMfa?.expiresIn ?? 0);
  const [showRecovery, setShowRecovery] = useState(false);

  const verifyForm = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: {
      challenge_token: pendingMfa?.challengeToken ?? '',
      code: '',
    },
  });
  const recoveryForm = useForm<MfaRecoveryFormValues>({
    resolver: zodResolver(mfaRecoverySchema),
    defaultValues: {
      challenge_token: pendingMfa?.challengeToken ?? '',
      recovery_code: '',
    },
  });

  useEffect(() => {
    if (!pendingMfa) return;
    setSecondsLeft(pendingMfa.expiresIn);
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingMfa]);

  if (!pendingMfa) {
    return <Redirect href="/(auth)/login" />;
  }

  const expired = secondsLeft <= 0;

  const verifyCode = verifyForm.handleSubmit(async (values) => {
    try {
      const tokens = await verifyMfaChallenge(values);
      await completeTokenSignIn(tokens);
    } catch (error) {
      verifyForm.setError('root', { message: toApiError(error).message });
    }
  });

  const recover = recoveryForm.handleSubmit(async (values) => {
    try {
      const tokens = await recoverMfaChallenge(values);
      await completeTokenSignIn(tokens);
    } catch (error) {
      recoveryForm.setError('root', { message: toApiError(error).message });
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
          <View style={styles.topStripe} />

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                color={theme.color.primary}
                name="shield-checkmark"
                size={30}
              />
            </View>
            <Text style={styles.title}>Verificación de Seguridad</Text>
            <Text style={styles.subtitle}>
              Ingresa el código de verificación de 6 dígitos solicitado por tu
              método de autenticación.
            </Text>
            <Text style={styles.method}>{methodLabel(pendingMfa.method)}</Text>
            <Text style={[styles.countdown, expired ? styles.expired : null]}>
              {expired
                ? 'El desafío expiró'
                : `Expira en ${formatCountdown(secondsLeft)}`}
            </Text>
          </View>

          <View style={styles.body}>
            <Controller
              control={verifyForm.control}
              name="code"
              render={({ field: { onChange, value } }) => (
                <View style={styles.codeSection}>
                  <CodeBoxes code={value} />
                  <TextField
                    autoComplete="one-time-code"
                    autoFocus
                    error={verifyForm.formState.errors.code?.message}
                    keyboardType="number-pad"
                    label="Código de verificación"
                    maxLength={6}
                    onChangeText={(nextValue) =>
                      onChange(nextValue.replace(/\D/g, '').slice(0, 6))
                    }
                    value={value}
                  />
                </View>
              )}
            />

            {verifyForm.formState.errors.root?.message ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons
                  color={theme.color.danger}
                  name="warning-outline"
                  size={20}
                />
                <Text style={styles.errorText}>
                  {verifyForm.formState.errors.root.message}
                </Text>
              </View>
            ) : null}

            <Button
              disabled={expired}
              loading={verifyForm.formState.isSubmitting}
              onPress={verifyCode}
            >
              Verificar
            </Button>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setShowRecovery((current) => !current)}
              style={styles.recoveryToggle}
            >
              <Ionicons
                color={theme.color.mutedText}
                name="key-outline"
                size={20}
              />
              <Text style={styles.recoveryToggleText}>
                {showRecovery
                  ? 'Ocultar código de recuperación'
                  : 'Usar código de recuperación'}
              </Text>
            </Pressable>

            {showRecovery ? (
              <View style={styles.recoveryCard}>
                <Controller
                  control={recoveryForm.control}
                  name="recovery_code"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      autoCapitalize="none"
                      error={recoveryForm.formState.errors.recovery_code?.message}
                      icon="key-outline"
                      label="Código de recuperación"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {recoveryForm.formState.errors.root?.message ? (
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {recoveryForm.formState.errors.root.message}
                  </Text>
                ) : null}
                <Button
                  loading={recoveryForm.formState.isSubmitting}
                  onPress={recover}
                  variant="secondary"
                >
                  Usar código de recuperación
                </Button>
              </View>
            ) : null}

            <Text style={styles.newChallengeHint}>
              Para solicitar un desafío nuevo, vuelve al inicio de sesión. Lumora
              no conserva tu contraseña para reenviar el desafío.
            </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Volver al inicio de sesión
            </Link>
          </View>

          <View style={styles.footer}>
            <Ionicons
              color={theme.color.mutedText}
              name="shield-checkmark-outline"
              size={15}
            />
            <Text style={styles.footerText}>Protegido por Lumora HN2026</Text>
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
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 560,
    overflow: 'hidden',
    width: '100%',
  },
  topStripe: {
    backgroundColor: theme.color.primaryPressed,
    height: 8,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 32,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    width: 84,
  },
  title: {
    color: theme.color.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 430,
    textAlign: 'center',
  },
  method: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  countdown: {
    color: theme.color.primaryPressed,
    fontSize: 13,
    fontWeight: '800',
  },
  expired: {
    color: theme.color.danger,
  },
  body: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  codeSection: {
    gap: theme.spacing.lg,
  },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: theme.color.dangerSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  errorText: {
    color: theme.color.dangerText,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    backgroundColor: theme.color.softBorder,
    height: 1,
    marginVertical: theme.spacing.xs,
  },
  recoveryToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
  },
  recoveryToggleText: {
    color: theme.color.mutedText,
    fontSize: 15,
    fontWeight: '800',
  },
  recoveryCard: {
    gap: theme.spacing.md,
  },
  newChallengeHint: {
    color: theme.color.subtleText,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    color: theme.color.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  footerText: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
});
