import { formatRelativeTime } from '@/features/notifications/utils/format-relative-time';

const AHORA = new Date('2026-08-29T12:00:00');

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AHORA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats a few minutes ago as "Hace N min"', () => {
    expect(formatRelativeTime('2026-08-29T11:50:00')).toBe('Hace 10 min');
  });

  it('formats less than a minute ago as "Ahora"', () => {
    expect(formatRelativeTime('2026-08-29T11:59:40')).toBe('Ahora');
  });

  it('formats a few hours ago, same day, as "Hace N hora(s)"', () => {
    expect(formatRelativeTime('2026-08-29T11:00:00')).toBe('Hace 1 hora');
    expect(formatRelativeTime('2026-08-29T09:00:00')).toBe('Hace 3 horas');
  });

  it('formats yesterday as "Ayer, HH:MM"', () => {
    expect(formatRelativeTime('2026-08-28T14:30:00')).toBe('Ayer, 14:30');
  });

  it('formats older dates as "Weekday, HH:MM"', () => {
    // 2026-08-24 es lunes.
    expect(formatRelativeTime('2026-08-24T09:00:00')).toBe('Lun, 09:00');
  });
});
