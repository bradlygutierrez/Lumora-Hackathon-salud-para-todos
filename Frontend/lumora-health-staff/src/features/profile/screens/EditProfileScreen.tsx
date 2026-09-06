import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useLocationMutations,
  useMyLocation,
} from '@/src/features/appointments/hooks/use-appointments';
import {
  locationSchema,
  type LocationForm,
  type LocationFormInput,
} from '@/src/features/appointments/schemas/location.schema';
import { toApiError } from '@/src/shared/api/api-error';
import { Button } from '@/src/shared/components/Button';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { StaffAvatar } from '@/src/shared/components/StaffAvatar';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { useAccountProfile } from '../hooks/use-account';
import { resolveProfileImageUrl } from '../utils/profile-image';
import {
  editProfileSchema,
  type EditProfileForm,
  type EditProfileFormInput,
} from '../schemas/account.schema';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function errorMessage(error: unknown): string {
  return toApiError(error).message;
}

export function EditProfileScreen() {
  const router = useRouter();
  const account = useAccountProfile();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const loadedId = useRef<number | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<EditProfileFormInput, unknown, EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { first_names: '', last_names: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (!account.data || loadedId.current === account.data.id) {
      return;
    }
    loadedId.current = account.data.id;
    reset({
      first_names: account.data.person.first_names,
      last_names: account.data.person.last_names,
      email: account.data.email,
      phone: account.data.person.phone ?? '',
    });
  }, [account.data, reset]);

  if (account.isLoading) {
    return <LoadingState title="Cargando tu perfil" />;
  }
  if (account.isError || !account.data) {
    return (
      <ErrorState
        message="Verificá la conexión e intentá nuevamente."
        title="No se pudo cargar tu perfil"
      />
    );
  }

  const busy = isSubmitting || account.update.isPending;

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
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
      setImageError('La imagen debe ser JPEG, PNG o WebP.');
      return;
    }
    setPreviewUri(asset.uri);
    account.uploadImage.mutate(
      { uri: asset.uri, mimeType, fileName: asset.fileName ?? 'perfil.jpg' },
      {
        onSuccess: () => setPreviewUri(null),
        onError: (error) => {
          setPreviewUri(null);
          setImageError(errorMessage(error));
        },
      },
    );
  };

  const onSubmit = handleSubmit((values) => {
    account.update.mutate(
      {
        email: values.email,
        person: {
          first_names: values.first_names,
          last_names: values.last_names,
          phone: values.phone || null,
        },
      },
      { onSuccess: () => router.back() },
    );
  });

  return (
    <Screen>
      <AppTopBar showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.title}>Editar Perfil</Text>

        <View style={styles.avatarSection}>
          <StaffAvatar
            firstName={account.data.person.first_names}
            imageUrl={previewUri ?? resolveProfileImageUrl(account.data.profile_image_url)}
            lastName={account.data.person.last_names}
            size={96}
          />
          <Button
            disabled={account.uploadImage.isPending}
            loading={account.uploadImage.isPending}
            onPress={() => void pickImage()}
            variant="secondary"
          >
            Cambiar foto
          </Button>
          {imageError ? (
            <Text accessibilityRole="alert" style={styles.imageError}>
              {imageError}
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="first_names"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Nombres"
              error={errors.first_names?.message}
              label="Nombres"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="last_names"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Apellidos"
              error={errors.last_names?.message}
              label="Apellidos"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Correo"
              autoCapitalize="none"
              error={errors.email?.message}
              keyboardType="email-address"
              label="Correo"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField
              accessibilityLabel="Teléfono"
              error={errors.phone?.message}
              keyboardType="phone-pad"
              label="Teléfono"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        {account.update.error ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage(account.update.error)}</Text>
          </View>
        ) : null}

        <Button disabled={busy} icon="save-outline" loading={busy} onPress={onSubmit}>
          Guardar cambios
        </Button>
        <Button disabled={busy} onPress={() => router.back()} variant="secondary">
          Cancelar
        </Button>

        <ConsultationAddressSection />
      </ScrollView>
    </Screen>
  );
}

function ConsultationAddressSection() {
  const location = useMyLocation();
  const mutations = useLocationMutations();
  const loadedLocationId = useRef<number | null>(null);

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<LocationFormInput, unknown, LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { nombre: '', direccion: '', consultorio: '' },
  });

  useEffect(() => {
    if (!location.data) {
      if (loadedLocationId.current !== null) {
        loadedLocationId.current = null;
        reset({ nombre: '', direccion: '', consultorio: '' });
      }
      return;
    }
    if (loadedLocationId.current === location.data.id) {
      return;
    }
    loadedLocationId.current = location.data.id;
    reset({
      nombre: location.data.nombre,
      direccion: location.data.direccion,
      consultorio: location.data.consultorio ?? '',
    });
  }, [location.data, reset]);

  const busy = mutations.save.isPending || mutations.remove.isPending;

  const onSubmit = handleSubmit((values) => {
    mutations.save.mutate({
      nombre: values.nombre,
      direccion: values.direccion,
      consultorio: values.consultorio || null,
    });
  });

  if (location.isLoading) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dirección de consulta</Text>
      <Text style={styles.sectionSubtitle}>
        Esta dirección aparece a tus pacientes al agendar una cita contigo.
      </Text>

      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Nombre del consultorio"
            error={errors.nombre?.message}
            label="Nombre del consultorio"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="direccion"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Dirección"
            error={errors.direccion?.message}
            label="Dirección"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name="consultorio"
        render={({ field }) => (
          <TextField
            accessibilityLabel="Consultorio o piso (opcional)"
            label="Consultorio o piso (opcional)"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />

      {mutations.save.error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage(mutations.save.error)}</Text>
        </View>
      ) : null}
      {mutations.remove.error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage(mutations.remove.error)}</Text>
        </View>
      ) : null}

      <Button disabled={busy} icon="save-outline" loading={mutations.save.isPending} onPress={onSubmit}>
        Guardar dirección
      </Button>
      {location.data ? (
        <Button
          disabled={busy}
          loading={mutations.remove.isPending}
          onPress={() => mutations.remove.mutate()}
          variant="secondary"
        >
          Quitar dirección
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: '800',
  },
  avatarSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  imageError: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: theme.color.dangerSoft,
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 4,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  errorText: {
    color: theme.color.dangerText,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    marginTop: -theme.spacing.sm,
  },
});
