import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useMutation,
} from '@tanstack/react-query';

import {
  authApi,
} from '@/features/auth/api/auth-api';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

import {
  Screen,
} from '@/shared/components/Screen';

import {
  AppHeader,
} from '@/shared/components/AppHeader';

import {
  SurfaceCard,
} from '@/shared/components/SurfaceCard';

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-coal-500">
        {label}
      </Text>

      <Text className="text-sm font-medium text-coal-900">
        {value}
      </Text>
    </View>
  );
}

type SecurityHref =
  | '/(app)/security'
  | '/(app)/security/change-password'
  | '/(app)/security/mfa'
  | '/(app)/security/sessions';

function ActionRow({
  label,
  subtitle,
  href,
}: {
  label: string;
  subtitle: string;
  href?: SecurityHref;
}) {
  return (
    <Pressable
      className="flex-row items-center justify-between py-3"
      onPress={() => {
        if (href) {
          router.push(href);
        }
      }}
    >
      <View>
        <Text className="text-sm font-semibold text-coal-900">
          {label}
        </Text>

        <Text className="mt-1 text-xs text-coal-500">
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#7B848B"
      />
    </Pressable>
  );
}

export default function ProfileRoute() {
  const clearSession =
    useAuthStore(
      (state) => state.clearSession,
    );

  /**
   * Revoca todas las sesiones en el backend.
   *
   * Solo después de una respuesta exitosa eliminamos
   * access/refresh tokens de SecureStore y cambiamos
   * authStore a `unauthenticated`.
   */
  const logoutAll = useMutation({
    mutationFn: () =>
      authApi.logoutAll(),

    onSuccess: async () => {
      await clearSession();

      /**
       * replace evita que Back recupere una pantalla
       * privada después del cierre de sesión.
       */
      router.replace('/(auth)/login');
    },
  });

  const confirmLogoutAll = () => {
    Alert.alert(
      'Cerrar todas las sesiones',
      'Se cerrará tu sesión en este dispositivo y en todos los demás.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesiones',
          style: 'destructive',

          onPress: () => {
            logoutAll.mutate();
          },
        },
      ],
    );
  };

  return (
    <Screen
      scrollable
      contentClassName="px-0 py-0"
    >
      <AppHeader
        showNotification
      />

      <View className="items-center px-4 pt-5">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-[#f1f4f6]">
          <Text className="text-3xl font-semibold text-[#4A86B6]">
            EM
          </Text>
        </View>

        <Text className="mt-5 text-4xl font-bold text-coal-900">
          Elena Martínez
        </Text>

        <Text className="mt-1 text-sm text-coal-500">
          elena.martinez@ejemplo.com
        </Text>

        <Pressable className="mt-5 rounded-full bg-[#78AEDD] px-4 py-3 active:opacity-80">
          <Text className="text-sm font-semibold text-white">
            Editar Perfil
          </Text>
        </Pressable>
      </View>

      <View className="gap-4 px-4 py-5">
        <SurfaceCard>
          <Text className="text-lg font-semibold text-coal-900">
            Perfil de Salud
          </Text>

          <View className="mt-4 gap-4">
            <ProfileRow
              label="Fecha de nacimiento"
              value="12 de Octubre, 1985 (38 años)"
            />

            <ProfileRow
              label="Sexo"
              value="Femenino"
            />

            <ProfileRow
              label="Tipo de sangre"
              value="O Positivo (O+)"
            />

            <ProfileRow
              label="Altura / Peso"
              value="165 cm / 62 kg"
            />
          </View>

          <View className="mt-5 rounded-2xl bg-[#f7f8f8] p-4">
            <Text className="text-xs text-coal-500">
              Contacto de Emergencia
            </Text>

            <Text className="mt-1 text-sm font-semibold text-coal-900">
              Carlos Martínez (Hermano)
            </Text>

            <Text className="mt-1 text-sm text-coal-500">
              +34 600 123 456
            </Text>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-coal-900">
              Familiares
            </Text>

            <Ionicons
              name="add"
              size={18}
              color="#78AEDD"
            />
          </View>

          <Text className="mt-3 text-sm leading-5 text-coal-500">
            Gestiona quién puede ver tu información médica.
          </Text>

          <View className="mt-4 gap-3">
            <View className="flex-row items-center justify-between rounded-2xl bg-[#f7f8f8] p-4">
              <View
                className="flex-row items-center"
                style={{
                  gap: 12,
                }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#dbeaf7]">
                  <Text className="font-semibold text-[#4A86B6]">
                    CM
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-coal-900">
                    Carlos Martínez
                  </Text>

                  <Text className="text-xs text-coal-500">
                    Acceso total
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#7B848B"
              />
            </View>

            <View className="flex-row items-center justify-between rounded-2xl bg-[#f7f8f8] p-4">
              <View
                className="flex-row items-center"
                style={{
                  gap: 12,
                }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#e5ecef]">
                  <Text className="font-semibold text-[#6F7D86]">
                    LM
                  </Text>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-coal-900">
                    Laura Martínez
                  </Text>

                  <Text className="text-xs text-coal-500">
                    Solo citas
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#7B848B"
              />
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text className="text-lg font-semibold text-coal-900">
            Seguridad
          </Text>

          <View className="mt-2">
            <ActionRow
              label="Contraseña"
              subtitle="Actualiza tu acceso y sesiones."
              href="/(app)/security/change-password"
            />

            <ActionRow
              label="Autenticación (MFA)"
              subtitle="Administra el acceso con TOTP."
              href="/(app)/security/mfa"
            />

            <ActionRow
              label="Sesiones activas"
              subtitle="Revisa y cierra otras sesiones."
              href="/(app)/security/sessions"
            />
          </View>
        </SurfaceCard>

        <Pressable
          accessibilityRole="button"
          disabled={logoutAll.isPending}
          className="rounded-full border border-[#d66b6b] px-4 py-3 active:opacity-80 disabled:opacity-50"
          onPress={confirmLogoutAll}
        >
          <Text className="text-center text-sm font-semibold text-[#d66b6b]">
            {logoutAll.isPending
              ? 'Cerrando sesiones...'
              : 'Cerrar sesión en todos los dispositivos'}
          </Text>
        </Pressable>

        {logoutAll.isError ? (
          <Text
            accessibilityRole="alert"
            className="text-center text-sm text-[#d66b6b]"
          >
            No fue posible cerrar todas las sesiones.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
