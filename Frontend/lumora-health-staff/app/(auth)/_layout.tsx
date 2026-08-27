import { Redirect, Stack } from 'expo-router';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';

export default function AuthLayout() {
  const { status } = useAuthSession();

  if (status === 'restoring') {
    return <LoadingState title="Restaurando sesión clínica" />;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(staff)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
