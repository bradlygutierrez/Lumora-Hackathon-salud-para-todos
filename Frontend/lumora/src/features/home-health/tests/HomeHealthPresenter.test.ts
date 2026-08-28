import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

import {
  HomeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

const presenter = new HomeHealthPresenter();

describe('HomeHealthPresenter', () => {
  it('returns the earliest future appointment even if API order is different', () => {
    const now = new Date('2026-08-28T08:00:00-06:00');

    const result = presenter.nextAppointment(
      [
        appointment(2, '2026-08-30T10:00:00-06:00'),
        appointment(1, '2026-08-29T09:00:00-06:00'),
      ],
      now,
    );

    expect(result?.id).toBe(1);
  });

  it('keeps only the latest measurement for each indicator', () => {
    const indicators: IndicadorMedicoResponse[] = [
      indicator('pressure', 'Presión arterial'),
      indicator('glucose', 'Glucosa'),
    ];

    const measurements: MedicionIndicadorResponse[] = [
      measurement('old', 'pressure', 110, '2026-08-27T08:00:00Z'),
      measurement('new', 'pressure', 120, '2026-08-28T08:00:00Z'),
      measurement('g1', 'glucose', 98, '2026-08-28T07:00:00Z'),
    ];

    const metrics = presenter.latestMetrics(
      measurements,
      indicators,
      [{ id: 1, nombre: 'mmHg' }],
      [],
    );

    expect(metrics).toHaveLength(2);
    expect(metrics[0]).toMatchObject({
      indicatorId: 'pressure',
      value: '120',
    });
  });

  it('marks a metric when its latest measurement generated an alert', () => {
    const measurements = [
      measurement('measurement-1', 'glucose', 125, '2026-08-28T08:00:00Z'),
    ];

    const alerts: AlertaClinicaResponse[] = [
      {
        id: 'alert-1',
        paciente_id: 7,
        medicion_id: 'measurement-1',
        nivel_severidad_id: 1,
        tipo_alerta_id: 1,
        origen_registro_id: 1,
        mensaje: 'Glucosa elevada',
        atendida: false,
        atendida_por_id: null,
        fecha_alerta: '2026-08-28T08:01:00Z',
        fecha_atencion: null,
      },
    ];

    const metrics = presenter.latestMetrics(
      measurements,
      [indicator('glucose', 'Glucosa')],
      [{ id: 1, nombre: 'mg/dL' }],
      alerts,
    );

    expect(metrics[0].hasAlert).toBe(true);
  });

  it('prioritizes severe allergies', () => {
    const allergy = presenter.primaryAllergy([
      {
        id: 1,
        name: 'Polen',
        description: null,
        severity: 'Leve',
        active: true,
      },
      {
        id: 2,
        name: 'Penicilina',
        description: null,
        severity: 'Alta',
        active: true,
      },
    ]);

    expect(allergy?.name).toBe('Penicilina');
  });
});

function appointment(id: number, start: string) {
  return {
    id,
    paciente_id: 7,
    profesional_id: 3,
    tipo_cita_id: 1,
    estado_cita_id: 1,
    inicio: start,
    fin: start,
    notas: null,
    created_at: start,
    updated_at: start,
  };
}

function indicator(id: string, nombre: string): IndicadorMedicoResponse {
  return {
    id,
    codigo: id,
    nombre,
    unidad_medida_id: 1,
    descripcion: null,
    activo: true,
    created_at: '2026-08-28T00:00:00Z',
  };
}

function measurement(
  id: string,
  indicadorId: string,
  valor: number,
  fecha: string,
): MedicionIndicadorResponse {
  return {
    id,
    paciente_id: 7,
    indicador_id: indicadorId,
    valor,
    unidad_medida_id: 1,
    origen_registro_id: 1,
    registrado_por_id: 99,
    fecha_medicion: fecha,
    observaciones: null,
  };
}
