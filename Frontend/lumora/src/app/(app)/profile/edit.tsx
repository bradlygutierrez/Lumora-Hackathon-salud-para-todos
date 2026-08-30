import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { OptionSelectField } from '@/features/auth/components/OptionSelectField';
import { accountApi } from '@/features/profile/api/account-api';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { useAccountProfile } from '@/features/profile/hooks/useAccountProfile';
import {
  accountEditSchema,
  emergencyContactSchema,
  type AccountEditForm,
  type EmergencyContactForm,
} from '@/features/profile/schemas/account.schemas';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { FormTextField } from '@/shared/components/FormTextField';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No fue posible guardar los cambios.';
}

export default function EditProfileRoute() {
  const queryClient = useQueryClient();
  const { showFeedback } = useFeedback();
  const profile = useAccountProfile();
  const { activePatient } = useShellContext();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const sexCatalog = useQuery({ queryKey: ['catalog', 'sexos'], queryFn: () => authApi.sexCatalog() });
  const emergency = useQuery({
    queryKey: ['profile', 'emergency', activePatient?.patientId],
    queryFn: () => accountApi.getEmergencyContacts(activePatient!.patientId),
    enabled: activePatient !== null,
  });

  const form = useForm<AccountEditForm>({
    resolver: zodResolver(accountEditSchema),
    values: profile.data
      ? {
          username: profile.data.username,
          email: profile.data.email,
          firstNames: profile.data.person.first_names,
          lastNames: profile.data.person.last_names,
          birthDate: profile.data.person.birth_date ?? '',
          phone: profile.data.person.phone ?? '',
          sexId: profile.data.person.sex_id,
        }
      : undefined,
  });
  const emergencyForm = useForm<EmergencyContactForm>({
    resolver: zodResolver(emergencyContactSchema),
    values: emergency.data?.items[0]
      ? {
          nombre: emergency.data.items[0].nombre,
          parentesco: emergency.data.items[0].parentesco,
          telefono: emergency.data.items[0].telefono,
          email: emergency.data.items[0].email ?? '',
        }
      : undefined,
  });
  const emergencySave = useMutation({
    mutationFn: (values: EmergencyContactForm) => {
      if (!activePatient) throw new Error('No existe un paciente activo.');
      const data = { ...values, email: values.email || null };
      const current = emergency.data?.items[0];
      return current
        ? accountApi.updateEmergencyContact(activePatient.patientId, current.id, data)
        : accountApi.createEmergencyContact(activePatient.patientId, data);
    },
    onSuccess: () => {
      showFeedback('Contacto de emergencia guardado.', 'success');
      return queryClient.invalidateQueries({ queryKey: ['profile', 'emergency', activePatient?.patientId] });
    },
  });

  if (profile.isPending || !profile.data) {
    return <FullScreenState title="Cargando perfil" message="Estamos preparando el formulario." />;
  }

  const pickImage = async () => {
    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      setImageError('La imagen debe ser JPEG, PNG o WebP.');
      return;
    }
    setPreviewUri(asset.uri);
    profile.uploadImage.mutate(
      { uri: asset.uri, mimeType, fileName: asset.fileName ?? 'profile.jpg' },
      {
        onSuccess: () => setPreviewUri(null),
        onError: (error) => {
          setPreviewUri(null);
          setImageError(errorMessage(error));
        },
      },
    );
  };

  const save = (values: AccountEditForm) =>
    profile.update.mutate(
      {
        username: values.username,
        email: values.email,
        person: {
          first_names: values.firstNames,
          last_names: values.lastNames,
          birth_date: values.birthDate || null,
          phone: values.phone || null,
          sex_id: values.sexId,
        },
      },
      { onSuccess: () => router.back() },
    );

  return (
    <Screen scrollable keyboardAvoiding contentClassName="gap-5">
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()}>
          <Text className="text-2xl text-coal-900">‹</Text>
        </Pressable>
        <Text className="text-xl font-bold text-coal-900">Editar perfil</Text>
      </View>

      <View className="items-center gap-3">
        <ProfileAvatar profile={profile.data} previewUri={previewUri} editable onPress={() => void pickImage()} />
        <AppButton title="Cambiar foto" variant="ghost" onPress={() => void pickImage()} />
        {imageError ? <Text className="text-center text-sm text-coal-900">{imageError}</Text> : null}
      </View>

      <ProfileSection title="Información personal">
        <FormTextField control={form.control} name="firstNames" label="Nombres" />
        <FormTextField control={form.control} name="lastNames" label="Apellidos" />
        <FormTextField control={form.control} name="username" label="Usuario" autoCapitalize="none" />
        <FormTextField control={form.control} name="email" label="Correo" keyboardType="email-address" autoCapitalize="none" />
        <FormTextField control={form.control} name="phone" label="Teléfono" keyboardType="phone-pad" />
        <FormTextField control={form.control} name="birthDate" label="Fecha de nacimiento" placeholder="AAAA-MM-DD" />
        <Controller
          control={form.control}
          name="sexId"
          render={({ field }) => (
            <OptionSelectField
              label="Sexo"
              optional
              value={field.value}
              options={sexCatalog.data?.items.map((item) => ({ label: item.nombre, value: item.id })) ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </ProfileSection>

      <ProfileSection title="Contacto de emergencia">
        <FormTextField control={emergencyForm.control} name="nombre" label="Nombre" />
        <FormTextField control={emergencyForm.control} name="parentesco" label="Parentesco" />
        <FormTextField control={emergencyForm.control} name="telefono" label="Teléfono" keyboardType="phone-pad" />
        <FormTextField control={emergencyForm.control} name="email" label="Correo (opcional)" keyboardType="email-address" />
        <AppButton
          title="Guardar contacto"
          variant="ghost"
          loading={emergencySave.isPending}
          onPress={emergencyForm.handleSubmit((values) => emergencySave.mutate(values))}
        />
      </ProfileSection>

      {profile.update.error ? <Text accessibilityRole="alert">{errorMessage(profile.update.error)}</Text> : null}
      <AppButton title="Guardar cambios" loading={profile.update.isPending} onPress={form.handleSubmit(save)} />
      <AppButton title="Cancelar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
