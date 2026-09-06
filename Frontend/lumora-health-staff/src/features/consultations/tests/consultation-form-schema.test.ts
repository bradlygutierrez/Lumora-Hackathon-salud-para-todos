import { consultationFormSchema } from '../schemas/consultation.schema';

describe('consultationFormSchema', () => {
  it('requires a reason text from the J11 product requirement and keeps optional backend fields optional', () => {
    const invalid = consultationFormSchema.safeParse({
      motivo_consulta_id: undefined,
      fecha_consulta: '',
      motivo: '',
      sintomas: '',
      evaluacion: '',
      indicaciones: '',
      observaciones: '',
      activo: true,
    });
    expect(invalid.success).toBe(false);

    const valid = consultationFormSchema.parse({
      motivo_consulta_id: undefined,
      fecha_consulta: '',
      motivo: 'Control general',
      sintomas: '',
      evaluacion: '',
      indicaciones: '',
      observaciones: '',
      activo: true,
    });
    expect(valid.motivo).toBe('Control general');
  });

  it('rejects invalid consultation dates and backend text limits', () => {
    expect(
      consultationFormSchema.safeParse({
        motivo_consulta_id: undefined,
        fecha_consulta: 'fecha-invalida',
        motivo: 'Control',
        sintomas: '',
        evaluacion: '',
        indicaciones: '',
        observaciones: '',
        activo: true,
      }).success,
    ).toBe(false);

    expect(
      consultationFormSchema.safeParse({
        motivo_consulta_id: undefined,
        fecha_consulta: '',
        motivo: 'x'.repeat(601),
        sintomas: '',
        evaluacion: '',
        indicaciones: '',
        observaciones: '',
        activo: true,
      }).success,
    ).toBe(false);
  });
});
