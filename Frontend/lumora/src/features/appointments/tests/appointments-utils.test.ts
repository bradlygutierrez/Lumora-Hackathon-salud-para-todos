import type {
  AppointmentResponse,
} from '@/features/appointments/types/appointments.types';

import {
  canManageAppointment,
  isPhysicalAppointmentType,
  requirePatientId,
  splitAppointments,
} from '@/features/appointments/utils/appointments';

function appointment(
  overrides: Partial<AppointmentResponse>,
): AppointmentResponse {
  return {
    id: 1,
    paciente_id: 7,
    profesional_id: 4,
    tipo_cita_id: 1,
    estado_cita_id: 1,
    inicio:
      '2026-09-05T09:00:00Z',
    fin:
      '2026-09-05T09:45:00Z',
    notas: null,
    created_at:
      '2026-08-29T12:00:00Z',
    updated_at:
      '2026-08-29T12:00:00Z',
    professional: null,
    status: {
      id: 1,
      nombre:
        'Pendiente',
    },
    appointment_type: {
      id: 1,
      nombre:
        'Presencial',
    },
    ...overrides,
  };
}

describe(
  'appointments utils',
  () => {
    it(
      'separa próximas y anteriores sin perder el historial',
      () => {
        const now =
          new Date(
            '2026-09-05T08:00:00Z',
          );

        const result =
          splitAppointments(
            [
              appointment({
                id: 1,
                inicio:
                  '2026-09-05T09:00:00Z',
                fin:
                  '2026-09-05T09:45:00Z',
              }),
              appointment({
                id: 2,
                inicio:
                  '2026-09-04T09:00:00Z',
                fin:
                  '2026-09-04T09:45:00Z',
              }),
            ],
            now,
          );

        expect(
          result.upcoming.map(
            (
              item,
            ) =>
              item.id,
          ),
        ).toEqual([
          1,
        ]);

        expect(
          result.previous.map(
            (
              item,
            ) =>
              item.id,
          ),
        ).toEqual([
          2,
        ]);
      },
    );

    it(
      'mueve una cita cancelada futura al historial',
      () => {
        const result =
          splitAppointments(
            [
              appointment({
                id: 3,
                status: {
                  id: 3,
                  nombre:
                    'Cancelada',
                },
                inicio:
                  '2026-09-10T09:00:00Z',
                fin:
                  '2026-09-10T09:45:00Z',
              }),
            ],
            new Date(
              '2026-09-05T08:00:00Z',
            ),
          );

        expect(
          result.upcoming,
        ).toHaveLength(
          0,
        );

        expect(
          result.previous.map(
            (item) =>
              item.id,
          ),
        ).toEqual([
          3,
        ]);
      },
    );

    it(
      'no permite mutar una cita cancelada',
      () => {
        expect(
          canManageAppointment(
            appointment({
              status: {
                id: 3,
                nombre:
                  'Cancelada',
              },
            }),
            new Date(
              '2026-09-05T08:00:00Z',
            ),
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'resuelve modalidad presencial por nombre y no por ID',
      () => {
        expect(
          isPhysicalAppointmentType({
            id: 99,
            nombre:
              'Presencial',
          }),
        ).toBe(
          true,
        );
      },
    );

    it(
      'requiere patientContext antes de operar',
      () => {
        expect(
          requirePatientId({
            patientId: 44,
          }),
        ).toBe(
          44,
        );

        expect(() =>
          requirePatientId(
            null,
          ),
        ).toThrow(
          'No existe un patientContext activo.',
        );
      },
    );
  },
);
