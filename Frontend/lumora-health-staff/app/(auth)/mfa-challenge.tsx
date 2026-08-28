import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import {
  createMfaChallenge,
  recoverMfaChallenge,
  verifyMfaChallenge,
} from '@/src/features/auth/api/auth.api';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  mfaChallengeSchema,
  mfaRecoverySchema,
  mfaVerifySchema,
  type MfaChallengeFormValues,
  type MfaRecoveryFormValues,
  type MfaVerifyFormValues,
} from '@/src/features/auth/schemas/mfa.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { CodeBoxes } from '@/src/shared/components/CodeBoxes';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function MfaChallengeScreen() {
  const { completeTokenSignIn, pendingMfa } = useAuthSession();
  const challengeForm = useForm<MfaChallengeFormValues>({
    resolver: zodResolver(mfaChallengeSchema),
    defaultValues: { username: '', password: '' },
  });
  const verifyForm = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { challenge_token: pendingMfa?.challengeToken ?? '', code: '' },
  });
  const recoveryForm = useForm<MfaRecoveryFormValues>({
    resolver: zodResolver(mfaRecoverySchema),
    defaultValues: { challenge_token: pendingMfa?.challengeToken ?? '', recovery_code: '' },
  });

  const requestChallenge = challengeForm.handleSubmit(async (values) => {
    try {
      const response = await createMfaChallenge(values);
      verifyForm.setValue('challenge_token', response.challenge_token);
      recoveryForm.setValue('challenge_token', response.challenge_token);
      challengeForm.setError('root', {
        message: `Desafío generado. Expira en ${response.expires_in} segundos.`,
      });
    } catch (error) {
      challengeForm.setError('root', { message: toApiError(error).message });
    }
  });

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
      <View style={styles.shell}>
        <View style={styles.card}>
          <View style={styles.topStripe} />
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons color={theme.color.primary} name="shield-checkmark" size={28} />
            </View>
            <Text style={styles.title}>Verificación de Seguridad</Text>
            <Text style={styles.subtitle}>
              Ingresa el codigo de verificacion de 6 digitos enviado a tu metodo seleccionado:
            </Text>
            <Text style={styles.method}>Método MFA configurado en tu cuenta</Text>
          </View>

          <Controller
            control={verifyForm.control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <>
                <CodeBoxes code={value} groups={[3, 3]} />
                <TextField
                  error={verifyForm.formState.errors.code?.message}
                  keyboardType="number-pad"
                  label="Codigo MFA"
                  maxLength={6}
                  onChangeText={onChange}
                  value={value}
                />
              </>
            )}
          />
          {!pendingMfa ? (
            <Controller
              control={verifyForm.control}
              name="challenge_token"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  autoCapitalize="none"
                  error={verifyForm.formState.errors.challenge_token?.message}
                  label="Desafio"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          ) : null}
          {verifyForm.formState.errors.root?.message ? (
            <Text style={styles.message}>{verifyForm.formState.errors.root.message}</Text>
          ) : null}
          <Button loading={verifyForm.formState.isSubmitting} onPress={verifyCode}>
            Verificar
          </Button>

          {!pendingMfa ? (
            <View style={styles.actions}>
              <Button icon="refresh-outline" onPress={requestChallenge} variant="ghost">
                Generar nuevo desafío
              </Button>
            </View>
          ) : null}

          <View style={styles.recoveryCard}>
            <Controller
              control={recoveryForm.control}
              name="recovery_code"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  autoCapitalize="none"
                  error={recoveryForm.formState.errors.recovery_code?.message}
                  icon="key-outline"
                  label="Codigo de recuperacion"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {recoveryForm.formState.errors.root?.message ? (
              <Text style={styles.message}>{recoveryForm.formState.errors.root.message}</Text>
            ) : null}
            <Button loading={recoveryForm.formState.isSubmitting} onPress={recover} variant="secondary">
              Usar codigo de recuperacion
            </Button>
          </View>

          <View style={styles.footer}>
            <Ionicons color={theme.color.mutedText} name="shield-checkmark-outline" size={13} />
            <Text style={styles.footerText}>Protegido por Lumora HN2026</Text>
          </View>
        </View>

        {!pendingMfa ? (
          <View style={styles.hiddenChallenge}>
            <Controller
              control={challengeForm.control}
              name="username"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  autoCapitalize="none"
                  error={challengeForm.formState.errors.username?.message}
                  icon="person-outline"
                  label="Usuario"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <Controller
              control={challengeForm.control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  error={challengeForm.formState.errors.password?.message}
                  icon="lock-closed-outline"
                  label="Contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  value={value}
                />
              )}
            />
            {challengeForm.formState.errors.root?.message ? (
              <Text style={styles.message}>{challengeForm.formState.errors.root.message}</Text>
            ) : null}
            <Button
              icon="send-outline"
              loading={challengeForm.formState.isSubmitting}
              onPress={requestChallenge}
            >
              Generar desafío
            </Button>
          </View>
        ) : null}
        <Link href="/(auth)/login" style={styles.link}>
          Volver a inicio de sesion
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: '#C3C6D54D',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  topStripe: {
    backgroundColor: theme.color.primaryPressed,
    height: 8,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#EBEEF4',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  title: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  method: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  link: {
    color: theme.color.primary,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  hiddenChallenge: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  actions: {
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  recoveryCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#F1F4FA',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  footerText: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
});
