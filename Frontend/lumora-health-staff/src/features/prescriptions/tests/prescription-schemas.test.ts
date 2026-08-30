import {
  prescriptionCreateFormSchema,
  prescriptionDetailFormSchema,
} from '../schemas/prescription.schemas';

const validDetail = {
  medicamento_id: 'med-1',
  unidad_medida_id: 1,
  via_administracion_id: 1,
  dosis: '50 mg',
  frecuencia: 'Cada 12 horas',
  duracion_dias: '30',
  cantidad_total: '60',
  instrucciones: '',
};

describe('prescription schemas J13', () => {
  it('requires at least one medication in the Health Staff workflow', () => {
    expect(
      prescriptionCreateFormSchema.safeParse({
        estado_id: 1,
        titulo: 'Tratamiento',
        vigencia_hasta: '',
        observaciones: '',
        detalles: [],
      }).success,
    ).toBe(false);

    expect(
      prescriptionCreateFormSchema.safeParse({
        estado_id: 1,
        titulo: 'Tratamiento',
        vigencia_hasta: '2026-09-30',
        observaciones: '',
        detalles: [validDetail],
      }).success,
    ).toBe(true);
  });

  it('rejects non-positive duration and quantity values', () => {
    expect(
      prescriptionDetailFormSchema.safeParse({
        ...validDetail,
        duracion_dias: '0',
        cantidad_total: '-1',
      }).success,
    ).toBe(false);
  });
});
