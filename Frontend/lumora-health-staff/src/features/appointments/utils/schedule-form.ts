import type { ProfessionalSchedulePayload } from '../types/appointment.types';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function buildSchedulePayload(
  day: number,
  start: string,
  end: string,
): ProfessionalSchedulePayload {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new Error('Seleccioná un día válido.');
  }
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    throw new Error('Usá horas en formato HH:MM.');
  }
  if (start >= end) {
    throw new Error('La hora de inicio debe ser menor que la hora final.');
  }
  return {
    dia_semana: day,
    hora_inicio: `${start}:00`,
    hora_fin: `${end}:00`,
    activo: true,
  };
}

export function shortTime(value: string): string {
  return value.slice(0, 5);
}
