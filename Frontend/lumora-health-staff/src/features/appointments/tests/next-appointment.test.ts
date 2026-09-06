import { pickNextAppointment } from '../utils/next-appointment';
import type { AppointmentDetail } from '../types/appointment.types';

function appointment(overrides: Partial<AppointmentDetail>): AppointmentDetail {
  return {
    id: 1,
    paciente_id: 9,
    profesional_id: 8,
    tipo_cita_id: null,
    estado_cita_id: 1,
    inicio: '2026-09-05T14:00:00Z',
    fin: '2026-09-05T14:45:00Z',
    notas: null,
    ubicacion_id: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    professional: null,
    status: { id: 1, nombre: 'Confirmada' },
    appointment_type: null,
    location: null,
    ...overrides,
  };
}

const now = new Date('2026-09-04T12:00:00Z');

describe('pickNextAppointment', () => {
  it('returns null when there are no appointments', () => {
    expect(pickNextAppointment([], now)).toBeNull();
  });

  it('ignores appointments that already ended', () => {
    const past = appointment({ id: 1, inicio: '2026-09-01T10:00:00Z', fin: '2026-09-01T10:30:00Z' });
    expect(pickNextAppointment([past], now)).toBeNull();
  });

  it('ignores cancelled appointments regardless of date', () => {
    const cancelled = appointment({
      id: 1,
      inicio: '2026-09-10T10:00:00Z',
      fin: '2026-09-10T10:30:00Z',
      status: { id: 3, nombre: 'Cancelada' },
    });
    expect(pickNextAppointment([cancelled], now)).toBeNull();
  });

  it('picks the soonest upcoming appointment regardless of which professional it belongs to', () => {
    const later = appointment({
      id: 1,
      profesional_id: 8,
      inicio: '2026-09-10T10:00:00Z',
      fin: '2026-09-10T10:30:00Z',
    });
    const sooner = appointment({
      id: 2,
      profesional_id: 99,
      inicio: '2026-09-06T09:00:00Z',
      fin: '2026-09-06T09:30:00Z',
    });
    expect(pickNextAppointment([later, sooner], now)?.id).toBe(2);
  });
});
