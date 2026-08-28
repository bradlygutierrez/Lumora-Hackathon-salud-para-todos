import {
  resolveLumoraRole,
} from '@/features/shell/navigation/shell-route-guard';

describe('resolveLumoraRole', () => {
  it('resolves Paciente', () => {
    expect(
      resolveLumoraRole([
        {
          id: 1,
          nombre: 'Paciente',
        },
      ]),
    ).toBe('patient');
  });

  it('resolves Cuidador', () => {
    expect(
      resolveLumoraRole([
        {
          id: 2,
          nombre: 'Cuidador',
        },
      ]),
    ).toBe('caregiver');
  });

  it('rejects roles from another app', () => {
    expect(
      resolveLumoraRole([
        {
          id: 3,
          nombre: 'Personal Médico',
        },
      ]),
    ).toBe('unsupported');
  });
});
