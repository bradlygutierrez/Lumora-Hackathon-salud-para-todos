import type { TimeOfDayBucket } from '@/features/prescriptions/types/prescriptions.types';

/**
 * Reglas de franja horaria para agrupar "Plan de Hoy".
 *
 * No vienen del backend (HorarioMedicamento solo guarda `hora`): son una
 * decisión de presentación. Rango usado:
 *
 * Mañana 05:00–11:59, Tarde 12:00–17:59, Noche 18:00–04:59.
 */
const MORNING_START_MINUTES = 5 * 60; // 05:00
const AFTERNOON_START_MINUTES = 12 * 60; // 12:00
const NIGHT_START_MINUTES = 18 * 60; // 18:00

/** Convierte "HH:MM:SS" o "HH:MM" a minutos desde medianoche. */
export function horaToMinutes(hora: string): number {
  const [hoursRaw, minutesRaw] = hora.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Hora inválida recibida del backend: "${hora}"`);
  }

  return hours * 60 + minutes;
}

/** Determina en qué franja del día cae un horario de medicamento. */
export function bucketForHora(hora: string): TimeOfDayBucket {
  const minutes = horaToMinutes(hora);

  if (minutes >= MORNING_START_MINUTES && minutes < AFTERNOON_START_MINUTES) {
    return 'manana';
  }

  if (minutes >= AFTERNOON_START_MINUTES && minutes < NIGHT_START_MINUTES) {
    return 'tarde';
  }

  return 'noche';
}

/** "14:30:00" -> "02:30 PM". */
export function formatHora12h(hora: string): string {
  const [hoursRaw, minutesRaw] = hora.split(':');
  const hours24 = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedHours = String(hours12).padStart(2, '0');

  return `${paddedHours}:${paddedMinutes} ${suffix}`;
}

/** true si dos fechas caen en el mismo día calendario, en hora local. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Combina la fecha de hoy con un "HH:MM:SS" para mandar `fecha_programada`. */
export function todayAtHora(hora: string): Date {
  const [hoursRaw, minutesRaw, secondsRaw] = hora.split(':');
  const now = new Date();

  now.setHours(Number(hoursRaw), Number(minutesRaw), Number(secondsRaw ?? '0'), 0);

  return now;
}

/** Etiqueta legible: "Jueves, 24 de Octubre". */
export function formatPlanDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDayBucket, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

export const TIME_OF_DAY_ORDER: TimeOfDayBucket[] = ['manana', 'tarde', 'noche'];
