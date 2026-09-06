const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_SHORT_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SECTION_HEADER_FORMATTER = new Intl.DateTimeFormat('es-NI', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  weekday: 'long',
});

const WEEK_RANGE_FORMATTER = new Intl.DateTimeFormat('es-NI', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Lunes de la semana UTC que contiene `date`, a medianoche UTC. */
export function startOfWeekUtc(date: Date): Date {
  const utcMidnight = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const mondayOffset = (utcMidnight.getUTCDay() + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - mondayOffset);
  return utcMidnight;
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDaysUtc(weekStart, index));
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateKeyFromValue(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function weekdayShortLabel(date: Date): string {
  return WEEKDAY_SHORT_LABELS[(date.getUTCDay() + 6) % 7];
}

export function formatSectionHeader(dateKey: string): string {
  const label = SECTION_HEADER_FORMATTER.format(new Date(`${dateKey}T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return `${WEEK_RANGE_FORMATTER.format(weekStart)} – ${WEEK_RANGE_FORMATTER.format(weekEnd)}`;
}

export type AgendaSection<T> = { dateKey: string; items: T[] };

export function groupByDate<T extends { inicio: string }>(items: T[]): AgendaSection<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKeyFromValue(item.inicio);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, sectionItems]) => ({
      dateKey,
      items: [...sectionItems].sort((a, b) => a.inicio.localeCompare(b.inicio)),
    }));
}
