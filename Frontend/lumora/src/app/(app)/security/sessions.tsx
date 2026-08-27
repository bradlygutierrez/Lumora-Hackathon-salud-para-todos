import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { authApi } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/shared/api/api-error';
import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

/**
 * Centro de sesiones B08.
 *
 * Nunca intenta geolocalizar una IP: el backend solo garantiza dispositivo,
 * plataforma, IP, timestamps e `is_current`.
 */
export default function ActiveSessionsRoute() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.sessions(),
  });

  const revoke = useMutation({
    mutationFn: (sessionId: number) => authApi.revokeSession(sessionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  const logoutOthers = useMutation({
    mutationFn: () => authApi.logoutOthers(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  const finishLocalLogout = async () => {
    await clearSession();
    queryClient.clear();
    router.replace('/(auth)/login');
  };

  const logoutCurrent = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: finishLocalLogout,
  });

  const logoutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: finishLocalLogout,
  });

  return (
    <Screen scrollable contentClassName="gap-5">
      <Text className="text-3xl font-bold text-coal-900">Sesiones Activas</Text>

      {sessions.isPending ? (
        <Text className="text-coal-500">Cargando sesiones...</Text>
      ) : null}

      {sessions.error ? (
        <Text accessibilityRole="alert" className="text-sm text-coal-900">
          {sessions.error instanceof ApiError
            ? sessions.error.message
            : 'No fue posible cargar las sesiones.'}
        </Text>
      ) : null}

      {sessions.data?.map((session) => (
        <View
          key={session.id}
          className="gap-2 rounded-2xl border border-lumen-300 bg-bone-300 p-4"
        >
          <View className="flex-row justify-between gap-3">
            <Text className="flex-1 text-lg font-semibold text-coal-900">
              {session.device_name}
            </Text>
            {session.is_current ? (
              <Text className="text-xs font-semibold text-coal-700">
                Este dispositivo
              </Text>
            ) : null}
          </View>

          <Text className="text-sm leading-5 text-coal-500">
            {session.platform} · {session.ip_address ?? 'IP no disponible'}
            {'\n'}Última actividad:{' '}
            {new Date(session.last_activity_at).toLocaleString()}
          </Text>

          {!session.is_current ? (
            <AppButton
              variant="ghost"
              title="Cerrar sesión"
              loading={revoke.isPending && revoke.variables === session.id}
              onPress={() => revoke.mutate(session.id)}
            />
          ) : null}
        </View>
      ))}

      <AppButton
        variant="secondary"
        title="Cerrar todas las demás sesiones"
        loading={logoutOthers.isPending}
        onPress={() => logoutOthers.mutate()}
      />
      <AppButton
        variant="ghost"
        title="Cerrar sesión actual"
        loading={logoutCurrent.isPending}
        onPress={() => logoutCurrent.mutate()}
      />
      <AppButton
        variant="ghost"
        title="Cerrar todas las sesiones"
        loading={logoutAll.isPending}
        onPress={() => logoutAll.mutate()}
      />
    </Screen>
  );
}
