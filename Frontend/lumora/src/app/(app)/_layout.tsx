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

/**
 * Layout principal de todas las rutas privadas.
 *
 * Responsabilidades:
 *
 * 1. Exigir autenticación B08.
 * 2. Esperar/respetar el contexto B09.
 * 3. Bloquear rutas patient-scoped cuando un caregiver
 *    todavía no ha seleccionado paciente.
 * 4. Permitir rutas user-scoped como Perfil y Seguridad.
 */
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

  /**
   * Ninguna ruta privada puede abrirse
   * sin una sesión válida.
   */
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
   * Cuando el caregiver aún no seleccionó paciente,
   * solo bloqueamos rutas que realmente dependen
   * de patientContext.
   *
   * Perfil, seguridad y selección de paciente
   * siguen disponibles.
   */
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

  /**
   * Roles que no pertenecen a la aplicación
   * Patient/Caregiver nunca deben entrar al shell.
   */
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