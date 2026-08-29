import type {
  AlertaClinicaResponse,
  IndicadorMedicoResponse,
  MedicionIndicadorResponse,
} from '@/features/health-indicators/types/health-indicators.types';

import type {
  AppointmentResponse,
} from '@/features/home-health/types/home-health.types';

import {
  HomeHealthPresenter,
} from '@/features/home-health/utils/HomeHealthPresenter';

/**
 * Tests unitarios de las reglas de presentación de B10.
 *
 * Aquí no probamos componentes React ni requests HTTP.
 * Probamos únicamente transformaciones determinísticas de datos.
 */
const presenter =
  new HomeHealthPresenter();

describe(
  'HomeHealthPresenter',
  () => {
    /**
     * La API puede devolver las citas en cualquier orden.
     *
     * B10 debe seleccionar la cita futura más cercana.
     */
    it(
      'returns the earliest future appointment even if API order is different',
      () => {
        const now =
          new Date(
            '2026-08-28T08:00:00-06:00',
          );

        const result =
          presenter.nextAppointment(
            [
              appointment(
                2,
                '2026-08-30T10:00:00-06:00',
              ),

              appointment(
                1,
                '2026-08-29T09:00:00-06:00',
              ),
            ],
            now,
          );

        expect(
          result?.id,
        ).toBe(1);
      },
    );

    /**
     * Inicio y Mi Salud solo necesitan mostrar
     * la medición más reciente de cada indicador.
     */
    it(
      'keeps only the latest measurement for each indicator',
      () => {
        const indicators:
          IndicadorMedicoResponse[] =
            [
              indicator(
                'pressure',
                'Presión arterial',
              ),

              indicator(
                'glucose',
                'Glucosa',
              ),
            ];

        const measurements:
          MedicionIndicadorResponse[] =
            [
              measurement(
                'old',
                'pressure',
                110,
                '2026-08-27T08:00:00Z',
              ),

              measurement(
                'new',
                'pressure',
                120,
                '2026-08-28T08:00:00Z',
              ),

              measurement(
                'g1',
                'glucose',
                98,
                '2026-08-28T07:00:00Z',
              ),
            ];

        const metrics =
          presenter.latestMetrics(
            measurements,
            indicators,

            [
              {
                id: 1,
                nombre: 'mmHg',
              },
            ],

            [],
          );

        expect(
          metrics,
        ).toHaveLength(2);

        expect(
          metrics[0],
        ).toMatchObject({
          indicatorId:
            'pressure',

          value:
            '120',
        });
      },
    );

    /**
     * Si la última medición generó una alerta clínica,
     * el indicador debe marcarse visualmente.
     */
    it(
      'marks a metric when its latest measurement generated an alert',
      () => {
        const measurements:
          MedicionIndicadorResponse[] =
            [
              measurement(
                'measurement-1',
                'glucose',
                125,
                '2026-08-28T08:00:00Z',
              ),
            ];

        const alerts:
          AlertaClinicaResponse[] =
            [
              {
                id:
                  'alert-1',

                paciente_id:
                  7,

                medicion_id:
                  'measurement-1',

                nivel_severidad_id:
                  1,

                tipo_alerta_id:
                  1,

                origen_registro_id:
                  1,

                mensaje:
                  'Glucosa elevada',

                atendida:
                  false,

                atendida_por_id:
                  null,

                fecha_alerta:
                  '2026-08-28T08:01:00Z',

                fecha_atencion:
                  null,
              },
            ];

        const metrics =
          presenter.latestMetrics(
            measurements,

            [
              indicator(
                'glucose',
                'Glucosa',
              ),
            ],

            [
              {
                id: 1,
                nombre:
                  'mg/dL',
              },
            ],

            alerts,
          );

        expect(
          metrics[0]
            .hasAlert,
        ).toBe(true);
      },
    );

    /**
     * Cuando existen varias alergias, B10 debe
     * priorizar la de mayor severidad.
     */
    it(
      'prioritizes severe allergies',
      () => {
        const allergy =
          presenter.primaryAllergy(
            [
              {
                id: 1,

                name:
                  'Polen',

                description:
                  null,

                severity:
                  'Leve',

                active:
                  true,
              },

              {
                id: 2,

                name:
                  'Penicilina',

                description:
                  null,

                severity:
                  'Alta',

                active:
                  true,
              },
            ],
          );

        expect(
          allergy?.name,
        ).toBe(
          'Penicilina',
        );
      },
    );

    it('keeps every pending clinical alert ordered newest-first', () => {
      const alerts = presenter.pendingAlerts([
        alert('old', '2026-08-28T08:00:00Z'),
        alert('new', '2026-08-29T08:00:00Z'),
        { ...alert('attended', '2026-08-30T08:00:00Z'), atendida: true },
      ]);

      expect(alerts.map((item) => item.id)).toEqual(['new', 'old']);
    });
  },
);

function alert(id: string, date: string): AlertaClinicaResponse {
  return {
    id,
    paciente_id: 7,
    medicion_id: `measurement-${id}`,
    nivel_severidad_id: 1,
    tipo_alerta_id: 1,
    origen_registro_id: 1,
    mensaje: 'Indicador fuera de rango',
    atendida: false,
    atendida_por_id: null,
    fecha_alerta: date,
    fecha_atencion: null,
  };
}

/**
 * Factory de citas utilizada por los tests.
 *
 * Mantiene exactamente el contrato AppointmentResponse
 * actualmente publicado por FastAPI.
 *
 * B10 añadió `professional` para que Inicio/Citas puedan
 * mostrar nombre y especialidad sin consultar el endpoint
 * staff-only de profesionales.
 */
function appointment(
  id: number,
  start: string,
): AppointmentResponse {
  const startDate =
    new Date(start);

  const endDate =
    new Date(
      startDate.getTime() +
        60 *
          60 *
          1000,
    );

  return {
    id,

    paciente_id:
      7,

    profesional_id:
      3,

    professional: {
      id:
        3,

      full_name:
        'Dra. Elena Silva',

      specialty:
        'Medicina Interna',
    },

    tipo_cita_id:
      1,

    estado_cita_id:
      1,

    inicio:
      start,

    fin:
      endDate.toISOString(),

    notas:
      null,

    created_at:
      start,

    updated_at:
      start,
  };
}

/**
 * Factory del catálogo de indicadores.
 */
function indicator(
  id: string,
  nombre: string,
): IndicadorMedicoResponse {
  return {
    id,

    codigo:
      id,

    nombre,

    unidad_medida_id:
      1,

    descripcion:
      null,

    activo:
      true,

    created_at:
      '2026-08-28T00:00:00Z',
  };
}

/**
 * Factory de mediciones.
 */
function measurement(
  id: string,
  indicadorId: string,
  valor: number,
  fecha: string,
): MedicionIndicadorResponse {
  return {
    id,

    paciente_id:
      7,

    indicador_id:
      indicadorId,

    valor,

    unidad_medida_id:
      1,

    origen_registro_id:
      1,

    registrado_por_id:
      99,

    fecha_medicion:
      fecha,

    observaciones:
      null,
  };
}
