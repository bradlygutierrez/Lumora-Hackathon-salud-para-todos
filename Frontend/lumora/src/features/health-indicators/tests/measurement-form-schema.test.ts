import { measurementFormSchema } from '@/features/health-indicators/utils/measurement-form-schema';

describe('measurementFormSchema (validación numérica y límites del formulario)', () => {
  it('accepts a valid decimal value', () => {
    const result = measurementFormSchema.safeParse({
      valor: '98.6',
      origen: 'Manual',
      observaciones: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty value', () => {
    const result = measurementFormSchema.safeParse({
      valor: '',
      origen: 'Manual',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric value', () => {
    const result = measurementFormSchema.safeParse({
      valor: 'abc',
      origen: 'Manual',
    });

    expect(result.success).toBe(false);
  });

  it('rejects values longer than 10 characters', () => {
    const result = measurementFormSchema.safeParse({
      valor: '12345678901',
      origen: 'Manual',
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero and negative values (un indicador no puede medir 0 o menos)', () => {
    expect(
      measurementFormSchema.safeParse({ valor: '0', origen: 'Manual' }).success,
    ).toBe(false);

    expect(
      measurementFormSchema.safeParse({ valor: '-5', origen: 'Manual' }).success,
    ).toBe(false);
  });

  it('rejects an origen that is not Manual/Dispositivo', () => {
    const result = measurementFormSchema.safeParse({
      valor: '120',
      origen: 'Profesional',
    });

    expect(result.success).toBe(false);
  });

  it('rejects observaciones longer than 500 characters', () => {
    const result = measurementFormSchema.safeParse({
      valor: '120',
      origen: 'Manual',
      observaciones: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('allows observaciones to be omitted', () => {
    const result = measurementFormSchema.safeParse({
      valor: '120',
      origen: 'Manual',
    });

    expect(result.success).toBe(true);
  });
});
