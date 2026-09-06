import { groupReminderBoard } from '@/features/reminders/utils/group-reminders';
import type { ReminderBoardItem } from '@/features/reminders/types/reminders.types';

function item(id: string, scheduledAt: Date): ReminderBoardItem {
  return {
    id,
    kind: 'seguimiento',
    scheduledAt,
    priority: 'normal',
    title: id,
    subtitle: '',
    instructions: null,
    done: false,
  };
}

describe('groupReminderBoard', () => {
  const now = new Date('2026-08-29T10:00:00.000Z');

  it('pone en "proximamente" lo vencido y lo que falta 3 horas o menos', () => {
    const vencido = item('vencido', new Date('2026-08-29T09:00:00.000Z'));
    const en1h = item('en1h', new Date('2026-08-29T11:00:00.000Z'));
    const en3h = item('en3h', new Date('2026-08-29T13:00:00.000Z'));

    const board = groupReminderBoard([en3h, vencido, en1h], now);

    expect(board.proximamente.map((i) => i.id)).toEqual(['vencido', 'en1h', 'en3h']);
    expect(board.masTarde).toEqual([]);
  });

  it('pone en "masTarde" lo que falta más de 3 horas, ordenado ascendente', () => {
    const en5h = item('en5h', new Date('2026-08-29T15:00:00.000Z'));
    const en4h = item('en4h', new Date('2026-08-29T14:00:00.000Z'));

    const board = groupReminderBoard([en5h, en4h], now);

    expect(board.proximamente).toEqual([]);
    expect(board.masTarde.map((i) => i.id)).toEqual(['en4h', 'en5h']);
  });
});
