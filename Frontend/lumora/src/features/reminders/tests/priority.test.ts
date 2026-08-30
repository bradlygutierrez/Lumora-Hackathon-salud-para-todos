import { computeReminderPriority } from '@/features/reminders/utils/priority';

describe('computeReminderPriority', () => {
  const now = new Date('2026-08-29T10:00:00.000Z');

  it('marca como "urgente" algo que ya venció', () => {
    const scheduledAt = new Date('2026-08-29T09:00:00.000Z');
    expect(computeReminderPriority(scheduledAt, now)).toBe('urgente');
  });

  it('marca como "urgente" algo que falta exactamente 1 hora', () => {
    const scheduledAt = new Date('2026-08-29T11:00:00.000Z');
    expect(computeReminderPriority(scheduledAt, now)).toBe('urgente');
  });

  it('marca como "normal" algo que falta más de 1 hora', () => {
    const scheduledAt = new Date('2026-08-29T11:01:00.000Z');
    expect(computeReminderPriority(scheduledAt, now)).toBe('normal');
  });
});
