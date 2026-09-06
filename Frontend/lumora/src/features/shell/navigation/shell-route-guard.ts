import type {
  ApiRole,
  LumoraRole,
} from '@/features/shell/types/shell.types';

/**
 * Resuelve el modo funcional de Lumora desde los roles entregados por FastAPI.
 *
 * B14:
 * una cuenta puede ser Paciente y Cuidador simultáneamente. En ese caso no
 * elegimos silenciosamente uno: devolvemos `dual` y el shell solicita modo.
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

  const isPatient = names.has('paciente');
  const isCaregiver = names.has('cuidador');

  if (isPatient && isCaregiver) {
    return 'dual';
  }

  if (isPatient) {
    return 'patient';
  }

  if (isCaregiver) {
    return 'caregiver';
  }

  return 'unsupported';
}

export function canOpenPatient(
  requestedPatientId: number,
  allowedPatientIds: readonly number[],
): boolean {
  return allowedPatientIds.includes(
    requestedPatientId,
  );
}

export function canOpenWithoutPatientContext(
  pathname: string,
): boolean {
  if (
    pathname === '/select-patient' ||
    pathname === '/select-mode'
  ) {
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

export function shouldClearPatientCache(
  previousPatientId: number | null,
  nextPatientId: number,
): boolean {
  return previousPatientId !== null && previousPatientId !== nextPatientId;
}
