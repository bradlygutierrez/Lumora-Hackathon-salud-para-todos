import { getPermissionNames, hasAnyPermission, hasPermission } from '../utils/permissions';
import type { StaffUser } from '../types/auth.types';

const staffUser: StaffUser = {
  id: 1,
  email: 'doctor@example.com',
  username: 'doctor',
  activo: true,
  email_verificado: true,
  persona: {
    id: 10,
    nombres: 'Ana',
    apellidos: 'Salud',
  },
  roles: [
    {
      id: 2,
      nombre: 'clinico',
      permisos: [
        { id: 3, nombre: 'clinica:manage' },
        { id: 4, nombre: 'consultas:create' },
      ],
    },
  ],
};

describe('staff permissions', () => {
  it('resolves permission names from backend role schema', () => {
    expect([...getPermissionNames(staffUser)]).toEqual([
      'clinica:manage',
      'consultas:create',
    ]);
  });

  it('checks allowed and denied permissions', () => {
    expect(hasPermission(staffUser, 'clinica:manage')).toBe(true);
    expect(hasPermission(staffUser, 'rbac:manage')).toBe(false);
  });

  it('checks any-of guards', () => {
    expect(hasAnyPermission(staffUser, ['rbac:manage', 'clinica:manage'])).toBe(true);
    expect(hasAnyPermission(staffUser, ['rbac:manage'])).toBe(false);
  });
});
