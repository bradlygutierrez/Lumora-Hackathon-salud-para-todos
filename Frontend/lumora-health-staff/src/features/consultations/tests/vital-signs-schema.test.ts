import { vitalSignsFormSchema } from '../schemas/vital-signs.schema';

const empty = {
  temperatura_c: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', presion_sistolica: '',
  presion_diastolica: '', saturacion_oxigeno: '', peso_kg: '', talla_cm: '', glucosa_mg_dl: '',
};

describe('vitalSignsFormSchema', () => {
  it.each([
    ['temperatura_c', '29.9'], ['temperatura_c', '45.1'], ['frecuencia_cardiaca', '251'],
    ['frecuencia_respiratoria', '4'], ['presion_sistolica', '261'], ['presion_diastolica', '29'],
    ['saturacion_oxigeno', '101'], ['peso_kg', '0.5'], ['talla_cm', '251'], ['glucosa_mg_dl', '801'],
  ])('enforces J03 numeric range for %s', (field, value) => {
    expect(vitalSignsFormSchema.safeParse({ ...empty, [field]: value }).success).toBe(false);
  });

  it('requires at least one measured value and accepts valid decimals/integers', () => {
    expect(vitalSignsFormSchema.safeParse(empty).success).toBe(false);
    expect(vitalSignsFormSchema.safeParse({ ...empty, temperatura_c: '36.7', presion_sistolica: '120' }).success).toBe(true);
  });
});
