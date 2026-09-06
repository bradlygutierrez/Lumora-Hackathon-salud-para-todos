import { enrichMeasurements, trendDelta } from '../utils/measurement-format';

describe('measurement formatting and trend', () => {
  it('enriches catalog ids and sorts newest first', () => {
    const result = enrichMeasurements(
      [
        {
          id: 'older',
          paciente_id: 1,
          indicador_id: 'heart',
          valor: 70,
          unidad_medida_id: 2,
          origen_registro_id: 3,
          registrado_por_id: 4,
          fecha_medicion: '2026-08-20T10:00:00Z',
          observaciones: null,
        },
        {
          id: 'newer',
          paciente_id: 1,
          indicador_id: 'heart',
          valor: 75,
          unidad_medida_id: 2,
          origen_registro_id: 3,
          registrado_por_id: 4,
          fecha_medicion: '2026-08-21T10:00:00Z',
          observaciones: null,
        },
      ],
      [
        {
          id: 'heart',
          codigo: 'HR',
          nombre: 'Pulso',
          unidad_medida_id: 2,
          descripcion: null,
          activo: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      [{ id: 2, nombre: 'bpm' }],
      [{ id: 3, nombre: 'Paciente' }],
    );

    expect(result[0]).toEqual(expect.objectContaining({
      id: 'newer',
      indicador: 'Pulso',
      unidad: 'bpm',
      origen: 'Paciente',
    }));
    expect(trendDelta(result.map((item) => item.valor))).toBe(5);
  });
});
