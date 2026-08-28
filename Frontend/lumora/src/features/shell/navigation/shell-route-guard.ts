import type { ApiRole, LumoraRole } from '@/features/shell/types/shell.types';

export function resolveLumoraRole(roles: ApiRole[]): LumoraRole {
  const names = new Set(
    roles.map((role) => role.nombre.trim().toLocaleLowerCase('es')),
  );

  if (names.has('paciente')) {
    return 'patient';
  }

  if (names.has('cuidador')) {
    return 'caregiver';
  }

  return 'unsupported';
}

export function canOpenPatient(
  requestedPatientId: number,
  allowedPatientIds: readonly number[],
): boolean {
  return allowedPatientIds.includes(requestedPatientId);
}
