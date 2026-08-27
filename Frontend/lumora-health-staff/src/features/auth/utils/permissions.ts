import type { StaffUser } from '../types/auth.types';

export function getPermissionNames(user?: StaffUser) {
  return new Set(
    user?.roles.flatMap((role) => role.permisos.map((permission) => permission.nombre)) ?? [],
  );
}

export function hasPermission(user: StaffUser | undefined, permission: string) {
  return getPermissionNames(user).has(permission);
}

export function hasAnyPermission(user: StaffUser | undefined, permissions: string[]) {
  if (permissions.length === 0) {
    return true;
  }

  const names = getPermissionNames(user);
  return permissions.some((permission) => names.has(permission));
}
