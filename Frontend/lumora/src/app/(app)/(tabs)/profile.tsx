import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import { authApi } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { accountApi } from '@/features/profile/api/account-api';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { useAccountProfile } from '@/features/profile/hooks/useAccountProfile';
import { profilePresenter } from '@/features/profile/utils/profile-presenter';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

export default function ProfileRoute() {
  const profile = useAccountProfile();
  const { activePatient } = useShellContext();
  const clearSession = useAuthStore((state) => state.clearSession);
  const emergency = useQuery({
    queryKey: ['profile', 'emergency', activePatient?.patientId],
    queryFn: () => accountApi.getEmergencyContacts(activePatient!.patientId),
    enabled: activePatient !== null,
  });
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: async () => {
      await clearSession();
      router.replace('/(auth)/login');
    },
  });

  if (profile.isPending) {
    return <FullScreenState title="Cargando perfil" message="Estamos consultando tu cuenta." />;
  }
  if (profile.isError || !profile.data) {
    return (
      <FullScreenState
        title="No pudimos cargar tu perfil"
        message="Revisa tu conexión e intenta nuevamente."
        actionLabel="Reintentar"
        onAction={() => void profile.refetch()}
      />
    );
  }

  const contact = emergency.data?.items[0];
  const address =
    profile.data.person.addresses.find((item) => item.is_primary) ??
    profile.data.person.addresses[0];

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader showNotification />
      <View className="items-center px-4 pt-5">
        <ProfileAvatar profile={profile.data} />
        <Text className="mt-4 text-2xl font-bold text-coal-900">
          {profilePresenter.fullName(profile.data)}
        </Text>
        <Text className="mt-1 text-sm text-coal-500">{profile.data.email}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/profile/edit')}
          className="mt-4 rounded-full bg-lumen-500 px-5 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-coal-900">Editar perfil</Text>
        </Pressable>
      </View>

      <View className="gap-4 px-4 py-5">
        <ProfileSection title="Información personal">
          <ProfileRow label="Usuario" value={profile.data.username} />
          <ProfileRow label="Teléfono" value={profile.data.person.phone ?? 'No registrado'} />
          <ProfileRow
            label="Fecha de nacimiento"
            value={profile.data.person.birth_date ?? 'No registrada'}
          />
          <ProfileRow
            label="Dirección"
            value={
              address
                ? [address.line_1, address.city, address.department, address.country]
                    .filter(Boolean)
                    .join(', ')
                : 'No registrada'
            }
          />
        </ProfileSection>

        <ProfileSection title="Contacto de emergencia">
          {emergency.isPending ? (
            <Text className="text-sm text-coal-500">Cargando contacto...</Text>
          ) : contact ? (
            <>
              <ProfileRow label="Nombre" value={`${contact.nombre} (${contact.parentesco})`} />
              <ProfileRow label="Teléfono" value={contact.telefono} />
            </>
          ) : (
            <Text className="text-sm text-coal-500">No hay un contacto registrado.</Text>
          )}
        </ProfileSection>

        <ProfileSection title="Seguridad">
          <ActionRow label="Contraseña" href="/(app)/security/change-password" />
          <ActionRow label="Autenticación multifactor" href="/(app)/security/mfa" />
          <ActionRow label="Sesiones activas" href="/(app)/security/sessions" />
        </ProfileSection>

        <Pressable
          accessibilityRole="button"
          disabled={logout.isPending}
          onPress={() =>
            Alert.alert('Cerrar sesión', '¿Deseas cerrar esta sesión?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout.mutate() },
            ])
          }
          className="rounded-full border border-coal-500/20 px-4 py-3 disabled:opacity-50"
        >
          <Text className="text-center text-sm font-semibold text-coal-900">
            {logout.isPending ? 'Cerrando...' : 'Cerrar sesión'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-coal-500">{label}</Text>
      <Text className="text-sm font-medium text-coal-900">{value}</Text>
    </View>
  );
}

function ActionRow({ label, href }: { label: string; href: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href as never)}
      className="flex-row items-center justify-between py-2"
    >
      <Text className="text-sm font-semibold text-coal-900">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#505A61" />
    </Pressable>
  );
}
