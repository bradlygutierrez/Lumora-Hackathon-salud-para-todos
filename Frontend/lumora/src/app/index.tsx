import {
  Redirect,
} from 'expo-router';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

/**
 * Decide qué zona de Lumora mostrar
 * después de restaurar la sesión.
 */
export default function IndexRoute() {
  const status = useAuthStore(
    (state) => state.status,
  );

  if (status === 'bootstrapping') {
    return null;
  }

  if (status === 'authenticated') {
    return (
      <Redirect
        href="/(app)/(tabs)"
      />
    );
  }

  return (
    <Redirect
      href="/(auth)/login"
    />
  );
}