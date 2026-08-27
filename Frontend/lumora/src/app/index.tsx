import {
  Redirect,
} from 'expo-router';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

/**
 * Ruta raíz "/".
 *
 * Decide qué zona debe abrir.
 *
 * React Router equivalente:
 *
 * <Navigate to="/login" />
 */
export default function IndexRoute() {
  const status =
    useAuthStore(
      (state) => state.status,
    );

  if (
    status === 'bootstrapping'
  ) {
    return null;
  }

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
    <Redirect
      href={{ pathname: '/login' } as any}
    />
  );
}