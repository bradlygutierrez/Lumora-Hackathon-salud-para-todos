import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/features/auth/store/auth-store';

/** Guard de todas las rutas privadas. */
export default function ProtectedAppLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
