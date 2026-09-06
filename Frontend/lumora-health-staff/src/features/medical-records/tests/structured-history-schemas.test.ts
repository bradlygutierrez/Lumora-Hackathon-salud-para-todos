import {
  allergyFormSchema,
  conditionFormSchema,
  disabilityFormSchema,
  medicalHistoryFormSchema,
} from '../schemas/structured-history.schemas';

describe('J12 structured history schemas', () => {
  it('requires condition name and a positive state id', () => {
    expect(
      conditionFormSchema.safeParse({
        nombre: '',
        estado_condicion_id: 0,
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
        motivo_historial: '',
        activo: true,
      }).success,
    ).toBe(false);

    expect(
      conditionFormSchema.safeParse({
        nombre: 'Hipertensión arterial',
        estado_condicion_id: 1,
        descripcion: '',
        fecha_inicio: '2026-08-29',
        fecha_fin: '',
        motivo_historial: 'Registro inicial',
        activo: true,
      }).success,
    ).toBe(true);
  });

  it('validates backend date format before sending conditions or history', () => {
    const invalidCondition = conditionFormSchema.safeParse({
      nombre: 'Condición',
      estado_condicion_id: 1,
      descripcion: '',
      fecha_inicio: '29/08/2026',
      fecha_fin: '',
      motivo_historial: '',
      activo: true,
    });
    const invalidHistory = medicalHistoryFormSchema.safeParse({
      tipo_antecedente_id: 1,
      descripcion: 'Antecedente',
      fecha: 'agosto 29',
      activo: true,
    });

    expect(invalidCondition.success).toBe(false);
    expect(invalidHistory.success).toBe(false);
  });

  it('accepts optional allergy and disability catalogs without inventing required fields', () => {
    expect(
      allergyFormSchema.safeParse({
        nombre: 'Penicilina',
        nivel_severidad_id: undefined,
        estado_condicion_id: undefined,
        observaciones: '',
        activo: true,
      }).success,
    ).toBe(true);
    expect(
      disabilityFormSchema.safeParse({
        nombre: 'Movilidad reducida',
        estado_condicion_id: undefined,
        observaciones: '',
        activo: true,
      }).success,
    ).toBe(true);
  });

  it('enforces J02 description length for medical history', () => {
    expect(
      medicalHistoryFormSchema.safeParse({
        tipo_antecedente_id: 1,
        descripcion: 'x'.repeat(301),
        fecha: '',
        activo: true,
      }).success,
    ).toBe(false);
  });
});
