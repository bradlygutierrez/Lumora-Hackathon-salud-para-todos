import type {
  ApiRole,
  LumoraRole,
} from '@/features/shell/types/shell.types';

/**
 * Resuelve el rol funcional utilizado por el frontend
 * a partir de los roles entregados por FastAPI.
 */
export function resolveLumoraRole(
  roles: ApiRole[],
): LumoraRole {
  const names = new Set(
    roles.map((role) =>
      role.nombre
        .trim()
        .toLocaleLowerCase('es'),
    ),
  );

  if (names.has('paciente')) {
    return 'patient';
  }

  if (names.has('cuidador')) {
    return 'caregiver';
  }

  return 'unsupported';
}

/**
 * Comprueba que un patientId solicitado pertenezca
 * realmente a la lista autorizada por el backend.
 */
export function canOpenPatient(
  requestedPatientId: number,
  allowedPatientIds: readonly number[],
): boolean {
  return allowedPatientIds.includes(
    requestedPatientId,
  );
}

/**
 * Algunas rutas privadas pertenecen al USUARIO,
 * no al paciente actualmente seleccionado.
 *
 * Un caregiver debe poder acceder a estas rutas
 * incluso cuando todavía no ha seleccionado
 * un patientContext.
 *
 * Ejemplos:
 *
 * - selección de paciente
 * - perfil propio
 * - centro de seguridad
 *
 * En cambio:
 *
 * - salud
 * - medicamentos
 * - citas
 *
 * sí necesitan un patientContext activo.
 */
export function canOpenWithoutPatientContext(
  pathname: string,
): boolean {
  if (pathname === '/select-patient') {
    return true;
  }

  if (pathname === '/profile') {
    return true;
  }

  if (
    pathname === '/security' ||
    pathname.startsWith('/security/')
  ) {
    return true;
  }

  return false;
}