import {
  Redirect,
  Stack,
  usePathname,
} from 'expo-router';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

import {
  ShellBootstrap,
} from '@/features/shell/components/ShellBootstrap';

import {
  canOpenWithoutPatientContext,
} from '@/features/shell/navigation/shell-route-guard';

import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

export default function ProtectedAppLayout() {
  const authStatus =
    useAuthStore(
      (state) =>
        state.status,
    );

  const shellStatus =
    usePatientContextStore(
      (state) =>
        state.status,
    );

  const pathname =
    usePathname();

  if (
    authStatus ===
    'unauthenticated'
  ) {
    return (
      <Redirect
        href="/(auth)/login"
      />
    );
  }

  /**
   * B14: una cuenta Paciente + Cuidador debe escoger explícitamente
   * el modo antes de construir patientContext.
   */
  if (
    shellStatus ===
      'needs-role' &&
    pathname !== '/select-mode'
  ) {
    return (
      <Redirect
        href="/(app)/select-mode"
      />
    );
  }

  if (
    shellStatus ===
      'needs-patient' &&
    !canOpenWithoutPatientContext(
      pathname,
    )
  ) {
    return (
      <Redirect
        href="/(app)/select-patient"
      />
    );
  }

  if (
    shellStatus ===
    'unsupported-role'
  ) {
    return (
      <Redirect
        href="/forbidden"
      />
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
