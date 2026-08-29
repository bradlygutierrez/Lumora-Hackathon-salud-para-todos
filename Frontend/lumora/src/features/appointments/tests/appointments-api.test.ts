import {
  AppointmentsApiService,
  type AppointmentHttpClient,
} from '@/features/appointments/api/appointments-api';

import type {
  AppointmentCreateRequest,
  AppointmentResponse,
} from '@/features/appointments/types/appointments.types';

function appointmentFixture(): AppointmentResponse {
  return {
    id: 11,
    paciente_id: 7,
    profesional_id: 4,
    tipo_cita_id: 1,
    estado_cita_id: 2,
    inicio:
      '2026-09-05T09:00:00Z',
    fin:
      '2026-09-05T09:45:00Z',
    notas:
      'Control',
    ubicacion_id: 1,
    created_at:
      '2026-08-29T12:00:00Z',
    updated_at:
      '2026-08-29T12:00:00Z',
    professional: {
      id: 4,
      full_name:
        'Dra. Dora Uno',
      specialty:
        'Medicina general',
    },
    status: {
      id: 2,
      nombre:
        'Pendiente',
    },
    appointment_type: {
      id: 1,
      nombre:
        'Presencial',
    },
  };
}

function setup() {
  const get =
    jest.fn();

  const post =
    jest.fn();

  const patch =
    jest.fn();

  const client = {
    get,
    post,
    patch,
  } as unknown as AppointmentHttpClient;

  return {
    api:
      new AppointmentsApiService(
        client,
      ),
    get,
    post,
    patch,
  };
}

describe(
  'AppointmentsApiService',
  () => {
    it('repairs the legacy Clínica location name', async () => {
      const { api, get } = setup();
      get.mockResolvedValue([
        {
          id: 1,
          nombre: 'Cl?nica Lumora',
          direccion: 'Managua',
        },
      ]);

      await expect(api.locations()).resolves.toEqual([
        {
          id: 1,
          nombre: 'Clínica Lumora',
          direccion: 'Managua',
        },
      ]);
    });

    it(
      'lista citas usando exclusivamente el patientContext recibido',
      async () => {
        const {
          api,
          get,
        } =
          setup();

        get.mockResolvedValue(
          [],
        );

        await api.list(
          23,
        );

        expect(
          get,
        ).toHaveBeenCalledWith(
          '/citas',
          {
            params: {
              paciente_id: 23,
            },
          },
        );
      },
    );

    it(
      'crea una cita sin inventar estado inicial',
      async () => {
        const {
          api,
          post,
        } =
          setup();

        post.mockResolvedValue(
          appointmentFixture(),
        );

        const payload: AppointmentCreateRequest =
          {
            paciente_id: 7,
            profesional_id: 4,
            tipo_cita_id: 1,
            inicio:
              '2026-09-05T09:00:00Z',
            fin:
              '2026-09-05T09:45:00Z',
            notas:
              'Control',
            ubicacion_id: 1,
          };

        await api.create(
          payload,
        );

        expect(
          post,
        ).toHaveBeenCalledWith(
          '/citas',
          payload,
        );

        expect(
          payload,
        ).not.toHaveProperty(
          'estado_cita_id',
        );
      },
    );

    it(
      'reprograma mediante el endpoint de dominio',
      async () => {
        const {
          api,
          patch,
        } =
          setup();

        patch.mockResolvedValue(
          appointmentFixture(),
        );

        const data = {
          inicio:
            '2026-09-06T10:00:00Z',
          fin:
            '2026-09-06T10:45:00Z',
        };

        await api.reschedule(
          11,
          data,
        );

        expect(
          patch,
        ).toHaveBeenCalledWith(
          '/citas/11/reprogramar',
          data,
        );
      },
    );

    it(
      'cancela lógicamente y envía el motivo opcional',
      async () => {
        const {
          api,
          post,
        } =
          setup();

        post.mockResolvedValue(
          appointmentFixture(),
        );

        await api.cancel(
          11,
          'Conflicto de horario',
        );

        expect(
          post,
        ).toHaveBeenCalledWith(
          '/citas/11/cancelar',
          {
            motivo:
              'Conflicto de horario',
          },
        );
      },
    );

    it(
      'consulta profesionales con búsqueda y especialidad',
      async () => {
        const {
          api,
          get,
        } =
          setup();

        get.mockResolvedValue(
          [],
        );

        await api.professionals({
          q: 'Rivera',
          specialty:
            'Cardiología',
        });

        expect(
          get,
        ).toHaveBeenCalledWith(
          '/citas/profesionales-disponibles',
          {
            params: {
              q:
                'Rivera',
              especialidad:
                'Cardiología',
            },
          },
        );
      },
    );
  },
);
