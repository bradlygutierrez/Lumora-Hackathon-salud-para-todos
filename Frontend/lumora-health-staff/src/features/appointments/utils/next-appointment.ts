import type { AppointmentDetail } from '../types/appointment.types';

const DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .trim()
    .toLocaleLowerCase('es');
}

function isCancelled(appointment: AppointmentDetail): boolean {
  return normalize(appointment.status?.nombre) === 'cancelada';
}

export function pickNextAppointment(
  appointments: AppointmentDetail[],
  now = new Date(),
): AppointmentDetail | null {
  const timestamp = now.getTime();
  const upcoming = appointments
    .filter((item) => !isCancelled(item) && new Date(item.fin).getTime() >= timestamp)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  return upcoming[0] ?? null;
}
