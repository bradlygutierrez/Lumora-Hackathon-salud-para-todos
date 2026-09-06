import { patientRegistrationSchema } from '../schemas/patient-registration.schema';

const valid = {
  nombres: 'Ana María',
  apellidos: 'López',
  email: 'ana@example.com',
  fecha_nacimiento: '1990-10-20',
  telefono: '88881111',
  sexo_id: 1,
  tipo_sangre_id: 2,
  alergias: '',
  direccion: 'Calle principal',
  ciudad: 'Managua',
  departamento: 'Managua',
  contacto_nombre: 'Carlos López',
  contacto_parentesco: 'Padre/Madre',
  contacto_telefono: '88882222',
};

describe('patient registration schema', () => {
  it('accepts the staff clinical registration fields without user credentials', () => {
    expect(patientRegistrationSchema.safeParse(valid).success).toBe(true);
    expect(patientRegistrationSchema.keyof().options).not.toContain('username');
    expect(patientRegistrationSchema.keyof().options).not.toContain('password');
  });

  it('rejects missing backend-required demographic and emergency data', () => {
    const parsed = patientRegistrationSchema.safeParse({ ...valid, sexo_id: 0, ciudad: '', contacto_parentesco: '' });
    expect(parsed.success).toBe(false);
  });

  it('normalizes blank optional contact email and allergy fields', () => {
    const parsed = patientRegistrationSchema.parse({ ...valid, email: '', alergias: '' });
    expect(parsed.email).toBeUndefined();
    expect(parsed.alergias).toBeUndefined();
  });
});
