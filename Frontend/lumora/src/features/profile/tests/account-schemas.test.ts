import {
  accountEditSchema,
  emergencyContactSchema,
} from '@/features/profile/schemas/account.schemas';

describe('profile schemas', () => {
  it('accepts an account update matching FastAPI', () => {
    expect(
      accountEditSchema.safeParse({
        username: 'ana.patient',
        email: 'ana@example.com',
        firstNames: 'Ana',
        lastNames: 'López',
        birthDate: '1990-05-10',
        phone: '+505 8888 8888',
        sexId: 1,
      }).success,
    ).toBe(true);
  });

  it('enforces emergency-contact backend limits', () => {
    expect(
      emergencyContactSchema.safeParse({
        nombre: '',
        parentesco: 'Hermana',
        telefono: '88888888',
        email: '',
      }).success,
    ).toBe(false);
  });
});
