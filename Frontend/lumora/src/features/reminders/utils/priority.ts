import type { ReminderPriority } from '@/features/reminders/types/reminders.types';

/** A10: no hay campo "prioridad" en el backend -- se calcula en el
 * cliente por cercanía, igual a como Alertas de Salud (A09) deriva
 * severidad sin guardar un campo nuevo. Vencido o a menos de 1 hora =
 * "Urgente" (badge ámbar, nunca rojo -- ver theme/tokens.ts). */
const URGENTE_WINDOW_MS = 60 * 60 * 1000;

export function computeReminderPriority(
  scheduledAt: Date,
  now: Date = new Date(),
): ReminderPriority {
  const diffMs = scheduledAt.getTime() - now.getTime();
  return diffMs <= URGENTE_WINDOW_MS ? 'urgente' : 'normal';
}
