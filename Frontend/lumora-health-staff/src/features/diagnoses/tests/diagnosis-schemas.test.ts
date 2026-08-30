import { diagnosisFormSchema } from '../schemas/diagnosis.schemas';

describe('diagnosis schema J13', () => {
  it('accepts the FastAPI diagnosis fields', () => {
    expect(
      diagnosisFormSchema.safeParse({
        tipo_diagnostico_id: 2,
        descripcion: 'Hipertensión arterial primaria',
        es_principal: true,
        fecha_diagnostico: '2026-08-29',
        activo: true,
      }).success,
    ).toBe(true);
  });

  it('rejects missing type, invalid date and descriptions over 700 chars', () => {
    expect(
      diagnosisFormSchema.safeParse({
        tipo_diagnostico_id: 0,
        descripcion: 'x'.repeat(701),
        es_principal: false,
        fecha_diagnostico: '29/08/2026',
        activo: true,
      }).success,
    ).toBe(false);
  });
});
