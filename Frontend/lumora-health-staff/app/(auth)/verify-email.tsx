import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { verifyEmail } from '@/src/features/auth/api/auth.api';
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from '@/src/features/auth/schemas/recovery.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { CodeBoxes } from '@/src/shared/components/CodeBoxes';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function VerifyEmailScreen() {
  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await verifyEmail(values);
      form.setError('root', { message: response.message });
    } catch (error) {
      form.setError('root', { message: toApiError(error).message });
    }
  });

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.sideRail} />
          <View style={styles.cardContent}>
            <View style={styles.iconCircle}>
              <Ionicons color={theme.color.primary} name="mail-open-outline" size={30} />
            </View>
            <Text style={styles.title}>Verifica tu identidad</Text>
            <Text style={styles.subtitle}>
              Hemos enviado un codigo de verificacion de 6 digitos a tu correo.
            </Text>
            <Controller
              control={form.control}
              name="token"
              render={({ field: { onBlur, onChange, value } }) => (
                <>
                  <CodeBoxes code={value.slice(0, 6)} />
                  <TextField
                    autoCapitalize="none"
                    error={form.formState.errors.token?.message}
                    label="Token completo de verificacion"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </>
              )}
            />
            {form.formState.errors.root?.message ? (
              <Text style={styles.message}>{form.formState.errors.root.message}</Text>
            ) : null}
            <Button icon="arrow-forward" loading={form.formState.isSubmitting} onPress={onSubmit}>
              Verificar
            </Button>
            <View style={styles.resendRow}>
              <Text style={styles.helper}>¿No recibiste el codigo?</Text>
              <Text style={styles.countdown}>Reenviar en 00:29</Text>
            </View>
            <Link href="/(auth)/login" style={styles.link}>
              Volver
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
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sideRail: {
    backgroundColor: theme.color.primary,
    width: 4,
  },
  cardContent: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
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
    color: theme.color.primary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  helper: {
    color: theme.color.mutedText,
    flex: 1,
    fontSize: theme.typography.body,
    textAlign: 'center',
  },
  countdown: {
    color: theme.color.primary,
    flex: 1,
    fontSize: theme.typography.body,
    textAlign: 'center',
  },
  link: {
    color: theme.color.primary,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
});
