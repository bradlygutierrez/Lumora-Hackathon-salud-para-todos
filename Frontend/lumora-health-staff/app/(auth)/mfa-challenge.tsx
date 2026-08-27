import { zodResolver } from '@hookform/resolvers/zod';
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
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function MfaChallengeScreen() {
  const { completeTokenSignIn } = useAuthSession();
  const challengeForm = useForm<MfaChallengeFormValues>({
    resolver: zodResolver(mfaChallengeSchema),
    defaultValues: { username: '', password: '' },
  });
  const verifyForm = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { challenge_token: '', code: '' },
  });
  const recoveryForm = useForm<MfaRecoveryFormValues>({
    resolver: zodResolver(mfaRecoverySchema),
    defaultValues: { challenge_token: '', recovery_code: '' },
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Desafío MFA</Text>
          <Link href="/(auth)/login" style={styles.link}>
            Volver a inicio de sesión
          </Link>
        </View>

        <View style={styles.card}>
          <Controller
            control={challengeForm.control}
            name="username"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                error={challengeForm.formState.errors.username?.message}
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
            loading={challengeForm.formState.isSubmitting}
            onPress={requestChallenge}
          >
            Generar desafío
          </Button>
        </View>

        <View style={styles.card}>
          <Controller
            control={verifyForm.control}
            name="challenge_token"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                error={verifyForm.formState.errors.challenge_token?.message}
                label="Desafío"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <Controller
            control={verifyForm.control}
            name="code"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                error={verifyForm.formState.errors.code?.message}
                keyboardType="number-pad"
                label="Código MFA"
                maxLength={6}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {verifyForm.formState.errors.root?.message ? (
            <Text style={styles.message}>{verifyForm.formState.errors.root.message}</Text>
          ) : null}
          <Button loading={verifyForm.formState.isSubmitting} onPress={verifyCode}>
            Verificar código
          </Button>
        </View>

        <View style={styles.card}>
          <Controller
            control={recoveryForm.control}
            name="recovery_code"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                autoCapitalize="none"
                error={recoveryForm.formState.errors.recovery_code?.message}
                label="Código de recuperación"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {recoveryForm.formState.errors.root?.message ? (
            <Text style={styles.message}>{recoveryForm.formState.errors.root.message}</Text>
          ) : null}
          <Button loading={recoveryForm.formState.isSubmitting} onPress={recover}>
            Usar recuperación
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
