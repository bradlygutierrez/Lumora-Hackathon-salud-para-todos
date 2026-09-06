import type {
  ReminderBoard,
  ReminderBoardItem,
} from '@/features/reminders/types/reminders.types';

/** A10: "Próximamente" = vencido o dentro de las próximas 3 horas;
 * "Más tarde" = el resto de hoy/después. Ambos grupos ordenados por
 * hora ascendente. */
const PROXIMAMENTE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function groupReminderBoard(
  items: ReminderBoardItem[],
  now: Date = new Date(),
): ReminderBoard {
  const sorted = [...items].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  );

  const proximamente: ReminderBoardItem[] = [];
  const masTarde: ReminderBoardItem[] = [];

  for (const item of sorted) {
    const diffMs = item.scheduledAt.getTime() - now.getTime();
    if (diffMs <= PROXIMAMENTE_WINDOW_MS) {
      proximamente.push(item);
    } else {
      masTarde.push(item);
    }
  }

  return { proximamente, masTarde };
}
