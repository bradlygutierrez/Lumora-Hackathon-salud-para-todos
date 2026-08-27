import { zodResolver } from '@hookform/resolvers/zod';
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
        <Text style={styles.title}>Verificación</Text>
        <Controller
          control={form.control}
          name="token"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextField
              autoCapitalize="none"
              error={form.formState.errors.token?.message}
              label="Token de verificación"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {form.formState.errors.root?.message ? (
          <Text style={styles.message}>{form.formState.errors.root.message}</Text>
        ) : null}
        <Button loading={form.formState.isSubmitting} onPress={onSubmit}>
          Verificar
        </Button>
        <Link href="/(auth)/login" style={styles.link}>
          Volver
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
  link: {
    color: theme.color.text,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
});
