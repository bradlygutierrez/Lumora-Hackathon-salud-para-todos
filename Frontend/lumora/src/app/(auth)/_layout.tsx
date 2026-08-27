import {
  Redirect,
  Stack,
} from 'expo-router';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

/**
 * Navegación disponible cuando
 * el usuario NO tiene sesión.
 */
export default function AuthLayout() {
  const status =
    useAuthStore(
      (state) => state.status,
    );

  /**
   * Si ya inició sesión no permitimos
   * volver manualmente a Login.
   */
  if (
    status === 'authenticated'
  ) {
    return (
      <Redirect
        href="/(tabs)"
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}