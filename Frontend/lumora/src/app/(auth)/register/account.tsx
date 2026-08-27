import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { PasswordRequirements } from '@/features/auth/components/PasswordRequirements';
import { RegistrationProgress } from '@/features/auth/components/RegistrationProgress';
import {
  registerAccountSchema,
  type RegisterAccountForm,
} from '@/features/auth/schemas/auth.schemas';
import { useRegistrationStore } from '@/features/auth/store/registration-store';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/** Paso 1 de 4: credenciales locales. Todavía no se llama al backend. */
export default function RegisterAccountRoute() {
  const saved = useRegistrationStore((state) => state.account);
  const setAccount = useRegistrationStore((state) => state.setAccount);

  const form = useForm<RegisterAccountForm>({
    resolver: zodResolver(registerAccountSchema),
    defaultValues: saved ?? {
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  const continueRegistration = (values: RegisterAccountForm) => {
    setAccount(values);
    router.push('/(auth)/register/personal');
  };

  return (
    <Screen scrollable keyboardAvoiding
      contentClassName="gap-6">
      <AuthHeader
        title="Crear cuenta"
        subtitle="Configura tus datos de acceso."
      />
      <RegistrationProgress step={1} />

      <View className="gap-4">
        <FormTextField
          control={form.control}
          name="username"
          label="Nombre de usuario"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormTextField
          control={form.control}
          name="email"
          label="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormTextField
          control={form.control}
          name="phone"
          label="Teléfono móvil"
          keyboardType="phone-pad"
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
        <PasswordRequirements value={password} />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <PasswordField
              label="Confirmar contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <AppButton
          title="Siguiente"
          onPress={form.handleSubmit(continueRegistration)}
        />
      </View>
    </Screen>
  );
}
