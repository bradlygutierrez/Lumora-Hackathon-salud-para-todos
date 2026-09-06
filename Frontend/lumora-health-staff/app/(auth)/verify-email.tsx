import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import {
  resendEmailVerification,
  verifyEmailCode,
} from '@/src/features/auth/api/auth.api';
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
    defaultValues: { email: '', code: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await verifyEmailCode(values);
      form.setError('root', { message: response.message });
    } catch (error) {
      form.setError('root', { message: toApiError(error).message });
    }
  });

  async function resendCode() {
    const email = form.getValues('email');
    const validEmail = await form.trigger('email');
    if (!validEmail) {
      return;
    }
    try {
      const response = await resendEmailVerification({ email });
      form.setError('root', { message: response.message });
    } catch (error) {
      form.setError('root', { message: toApiError(error).message });
    }
  }

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
              Ingresa el código de 6 dígitos enviado a tu correo.
            </Text>
            <Controller
              control={form.control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  autoCapitalize="none"
                  autoComplete="email"
                  error={form.formState.errors.email?.message}
                  keyboardType="email-address"
                  label="Correo"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <Controller
              control={form.control}
              name="code"
              render={({ field: { onChange, value } }) => (
                <>
                  <CodeBoxes code={value} />
                  <TextField
                    error={form.formState.errors.code?.message}
                    keyboardType="number-pad"
                    label="Código de verificación"
                    maxLength={6}
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
            <Button icon="refresh-outline" onPress={resendCode} variant="ghost">
              Reenviar código
            </Button>
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
  link: {
    color: theme.color.primary,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
});
