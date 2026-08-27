import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { RegistrationProgress } from '@/features/auth/components/RegistrationProgress';
import {
  registerEmergencySchema,
  type RegisterEmergencyForm,
} from '@/features/auth/schemas/auth.schemas';
import { useRegistrationStore } from '@/features/auth/store/registration-store';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/**
 * Paso 3 de 4.
 * Backend usa `relationship: string`; por eso no inventamos tipo_relacion_id.
 */
export default function RegisterEmergencyRoute() {
  const saved = useRegistrationStore((state) => state.emergency);
  const setEmergency = useRegistrationStore((state) => state.setEmergency);

  const form = useForm<RegisterEmergencyForm>({
    resolver: zodResolver(registerEmergencySchema),
    defaultValues: saved ?? {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  const continueRegistration = (values: RegisterEmergencyForm) => {
    setEmergency(values);
    router.push('/(auth)/register/review');
  };

  return (
    <Screen scrollable keyboardAvoiding
      contentClassName="gap-6">
      <AuthHeader
        title="Contacto de Emergencia"
        subtitle="Persona a quien podemos contactar si es necesario."
      />
      <RegistrationProgress step={3} />

      <View className="gap-4">
        <FormTextField
          control={form.control}
          name="name"
          label="Nombre del contacto"
        />
        <FormTextField
          control={form.control}
          name="relationship"
          label="Relación"
        />
        <FormTextField
          control={form.control}
          name="phone"
          label="Teléfono de emergencia"
          keyboardType="phone-pad"
        />

        <AppButton
          title="Siguiente"
          onPress={form.handleSubmit(continueRegistration)}
        />
      </View>
    </Screen>
  );
}
