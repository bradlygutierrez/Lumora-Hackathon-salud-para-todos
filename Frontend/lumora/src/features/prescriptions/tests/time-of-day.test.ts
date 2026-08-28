import {
  bucketForHora,
  formatHora12h,
  formatPlanDate,
  horaToMinutes,
  isSameLocalDay,
  todayAtHora,
} from '@/features/prescriptions/utils/time-of-day';

describe('horaToMinutes', () => {
  it('converts "HH:MM:SS" to minutes since midnight', () => {
    expect(horaToMinutes('08:00:00')).toBe(480);
    expect(horaToMinutes('00:00:00')).toBe(0);
    expect(horaToMinutes('23:59:00')).toBe(1439);
  });

  it('throws on a value that is not a valid time', () => {
    expect(() => horaToMinutes('not-a-time')).toThrow();
  });
});

describe('bucketForHora', () => {
  it('classifies boundary and mid-range times correctly', () => {
    expect(bucketForHora('04:59:00')).toBe('noche');
    expect(bucketForHora('05:00:00')).toBe('manana');
    expect(bucketForHora('08:00:00')).toBe('manana');
    expect(bucketForHora('11:59:00')).toBe('manana');
    expect(bucketForHora('12:00:00')).toBe('tarde');
    expect(bucketForHora('17:59:00')).toBe('tarde');
    expect(bucketForHora('18:00:00')).toBe('noche');
    expect(bucketForHora('23:30:00')).toBe('noche');
  });
});

describe('formatHora12h', () => {
  it('formats morning, noon, midnight and evening times', () => {
    expect(formatHora12h('08:00:00')).toBe('08:00 AM');
    expect(formatHora12h('00:00:00')).toBe('12:00 AM');
    expect(formatHora12h('12:00:00')).toBe('12:00 PM');
    expect(formatHora12h('20:30:00')).toBe('08:30 PM');
  });
});

describe('isSameLocalDay', () => {
  it('is true for the same calendar day regardless of time', () => {
    const morning = new Date(2026, 7, 27, 6, 0, 0);
    const night = new Date(2026, 7, 27, 23, 0, 0);
    expect(isSameLocalDay(morning, night)).toBe(true);
  });

  it('is false across a day boundary', () => {
    const today = new Date(2026, 7, 27, 23, 59, 0);
    const tomorrow = new Date(2026, 7, 28, 0, 1, 0);
    expect(isSameLocalDay(today, tomorrow)).toBe(false);
  });
});

describe('todayAtHora', () => {
  it('keeps today\'s date but sets the given hora', () => {
    const result = todayAtHora('14:30:00');
    const now = new Date();

    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(now.getDate());
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('formatPlanDate', () => {
  it('capitalizes the first letter of the localized date', () => {
    const date = new Date(2026, 9, 24); // Sábado 24 de octubre de 2026
    const formatted = formatPlanDate(date);

    expect(formatted[0]).toBe(formatted[0].toUpperCase());
    expect(formatted).toContain('24');
    expect(formatted.toLowerCase()).toContain('octubre');
  });
});
