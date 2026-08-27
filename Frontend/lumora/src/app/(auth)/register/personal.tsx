import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { OptionSelectField } from '@/features/auth/components/OptionSelectField';
import { RegistrationProgress } from '@/features/auth/components/RegistrationProgress';
import {
  registerPersonalSchema,
  type RegisterPersonalForm,
} from '@/features/auth/schemas/auth.schemas';
import { useRegistrationStore } from '@/features/auth/store/registration-store';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { Screen } from '@/shared/components/Screen';

/**
 * Paso 2 de 4.
 *
 * Los IDs de sexo y tipo de sangre provienen de los catálogos reales del
 * backend. Sexo es obligatorio por contrato; tipo de sangre es opcional.
 */
export default function RegisterPersonalRoute() {
  const saved = useRegistrationStore((state) => state.personal);
  const setPersonal = useRegistrationStore((state) => state.setPersonal);

  const sexCatalog = useQuery({
    queryKey: ['catalog', 'sexos'],
    queryFn: () => authApi.sexCatalog(),
  });

  const bloodTypeCatalog = useQuery({
    queryKey: ['catalog', 'blood-types'],
    queryFn: () => authApi.bloodTypeCatalog(),
  });

  const form = useForm<RegisterPersonalForm>({
    resolver: zodResolver(registerPersonalSchema),
    defaultValues: saved ?? {
      firstNames: '',
      lastNames: '',
      birthDate: '',
      sexId: 0,
      bloodTypeId: null,
      addressLine1: '',
      city: 'Managua',
      department: 'Managua',
      country: 'Nicaragua',
      postalCode: '',
    },
  });

  const continueRegistration = (values: RegisterPersonalForm) => {
    setPersonal(values);
    router.push('/(auth)/register/emergency');
  };

  return (
    <Screen scrollable keyboardAvoiding
      contentClassName="gap-6">
      <AuthHeader
        title="Información Personal"
        subtitle="Datos necesarios para crear tu perfil de paciente."
      />
      <RegistrationProgress step={2} />

      <View className="gap-4">
        <FormTextField
          control={form.control}
          name="firstNames"
          label="Nombres"
        />
        <FormTextField
          control={form.control}
          name="lastNames"
          label="Apellidos"
        />
        <FormTextField
          control={form.control}
          name="birthDate"
          label="Fecha de nacimiento"
          placeholder="AAAA-MM-DD"
          autoCapitalize="none"
        />

        <Controller
          control={form.control}
          name="sexId"
          render={({ field, fieldState }) => (
            <View className="gap-1">
              <OptionSelectField
                label="Género / sexo"
                value={field.value || null}
                options={(sexCatalog.data?.items ?? []).map((item) => ({
                  label: item.nombre,
                  value: item.id,
                }))}
                onChange={(value) => field.onChange(value ?? 0)}
              />
              {fieldState.error ? (
                <Text className="text-xs font-medium text-coal-900">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={form.control}
          name="bloodTypeId"
          render={({ field }) => (
            <OptionSelectField
              label="Tipo de sangre"
              optional
              value={field.value}
              options={(bloodTypeCatalog.data?.items ?? []).map((item) => ({
                label: item.nombre,
                value: item.id,
              }))}
              onChange={field.onChange}
            />
          )}
        />

        {sexCatalog.isError || bloodTypeCatalog.isError ? (
          <Text className="text-sm text-coal-900">
            No fue posible cargar uno de los catálogos. Revisa tu conexión e
            intenta nuevamente.
          </Text>
        ) : null}

        <FormTextField
          control={form.control}
          name="addressLine1"
          label="Dirección de domicilio"
        />
        <FormTextField
          control={form.control}
          name="city"
          label="Ciudad"
        />
        <FormTextField
          control={form.control}
          name="department"
          label="Departamento"
        />
        <FormTextField
          control={form.control}
          name="country"
          label="País"
        />
        <FormTextField
          control={form.control}
          name="postalCode"
          label="Código postal (opcional)"
        />

        <AppButton
          title="Siguiente"
          disabled={sexCatalog.isPending}
          onPress={form.handleSubmit(continueRegistration)}
        />
      </View>
    </Screen>
  );
}
