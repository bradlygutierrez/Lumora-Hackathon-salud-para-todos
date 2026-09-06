import {
  canManagePatientData,
  permisoNivel,
  permisoNivelLabel,
} from '@/features/caregiver-access/utils/caregiver-permissions';

describe('canManagePatientData', () => {
  it('returns true only for write access', () => {
    expect(canManagePatientData('write')).toBe(true);
  });

  it('returns false for read access', () => {
    expect(canManagePatientData('read')).toBe(false);
  });

  it('returns false when there is no access level yet', () => {
    expect(canManagePatientData(null)).toBe(false);
  });
});

describe('permisoNivel', () => {
  it('maps write to completo', () => {
    expect(permisoNivel('write')).toBe('completo');
  });

  it('maps read to solo-lectura', () => {
    expect(permisoNivel('read')).toBe('solo-lectura');
  });

  it('maps anything else to no-definido', () => {
    expect(permisoNivel(null)).toBe('no-definido');
    expect(permisoNivel('algo-desconocido')).toBe('no-definido');
  });
});

describe('permisoNivelLabel', () => {
  it('labels every level in Spanish', () => {
    expect(permisoNivelLabel('completo')).toBe('Completo');
    expect(permisoNivelLabel('solo-lectura')).toBe('Solo lectura');
    expect(permisoNivelLabel('no-definido')).toBe('No definido');
  });
});
