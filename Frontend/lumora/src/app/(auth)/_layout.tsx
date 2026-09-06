import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/features/auth/store/auth-store';

/** Rutas públicas de autenticación. */
export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
