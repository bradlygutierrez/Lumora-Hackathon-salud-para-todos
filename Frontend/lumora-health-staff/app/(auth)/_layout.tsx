import { Redirect, Stack, type Href } from 'expo-router';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';

export default function AuthLayout() {
  const { permissions, status } = useAuthSession();

  if (status === 'restoring') {
    return <LoadingState title="Restaurando sesión clínica" />;
  }

  if (status === 'authenticated') {
    return (
      <Redirect
        href={(permissions.has('clinica:manage') ? '/(staff)' : '/unauthorized') as Href}
      />
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
