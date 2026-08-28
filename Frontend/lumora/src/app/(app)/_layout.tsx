import {
  Redirect,
  Stack,
  usePathname,
} from 'expo-router';

import { useAuthStore } from '@/features/auth/store/auth-store';

import {
  ShellBootstrap,
} from '@/features/shell/components/ShellBootstrap';

import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

export default function ProtectedAppLayout() {
  const authStatus = useAuthStore(
    (state) => state.status,
  );

  const shellStatus = usePatientContextStore(
    (state) => state.status,
  );

  const pathname = usePathname();

  if (authStatus === 'unauthenticated') {
    return (
      <Redirect href="/(auth)/login" />
    );
  }

  const isPatientSelectionRoute =
    pathname === '/select-patient';

  if (
    shellStatus === 'needs-patient' &&
    !isPatientSelectionRoute
  ) {
    return (
      <Redirect href="/(app)/select-patient" />
    );
  }

  if (shellStatus === 'unsupported-role') {
    return (
      <Redirect href="/forbidden" />
    );
  }

  return (
    <ShellBootstrap>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ShellBootstrap>
  );
}
