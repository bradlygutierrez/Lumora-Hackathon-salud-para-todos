import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { useLogin } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  loginSchema,
  type LoginForm,
} from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/**
 * Login B08.
 *
 * El backend permite iniciar sesión con username o email en el mismo campo
 * `login`. `useLogin()` decide si guardar tokens o continuar al challenge MFA.
 */
export default function LoginRoute() {
  const notice = useAuthStore((state) => state.notice);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const login = useLogin();

  return (
    <Screen scrollable keyboardAvoiding
      contentClassName="justify-center gap-7">
      <AuthHeader
        back={false}
        title="Iniciar Sesión"
        subtitle="Accede a Lumora con tu usuario o correo."
      />

      <View className="gap-4">
        {notice === 'session-expired' ? (
          <Text accessibilityRole="alert" className="text-sm font-medium text-coal-900">
            Tu sesión expiró. Iniciá sesión nuevamente.
          </Text>
        ) : null}
        <FormTextField
          control={form.control}
          name="login"
          label="Usuario o correo electrónico"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <PasswordField
              label="Contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        {login.error ? (
          <Text accessibilityRole="alert" className="text-sm text-coal-900">
            {login.error instanceof ApiError
              ? login.error.message
              : 'No fue posible iniciar sesión.'}
          </Text>
        ) : null}

        <AppButton
          title="Entrar"
          loading={login.isPending}
          onPress={form.handleSubmit((values) => login.mutate(values))}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="link">
            <Text className="text-center font-medium text-coal-700">
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/register/account" asChild>
          <Pressable accessibilityRole="link">
            <Text className="text-center font-semibold text-coal-900">
              Crear cuenta
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
