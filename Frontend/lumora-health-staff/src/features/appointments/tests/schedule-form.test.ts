import { buildSchedulePayload, shortTime } from '../utils/schedule-form';

describe('schedule form', () => {
  it('builds backend times without hardcoded professional ids', () => {
    expect(buildSchedulePayload(2, '08:30', '12:00')).toEqual({
      dia_semana: 2,
      hora_inicio: '08:30:00',
      hora_fin: '12:00:00',
      activo: true,
    });
    expect(shortTime('08:30:00')).toBe('08:30');
  });

  it('rejects invalid periods and time formats', () => {
    expect(() => buildSchedulePayload(0, '10:00', '09:00')).toThrow(
      'La hora de inicio debe ser menor',
    );
    expect(() => buildSchedulePayload(0, '8:00', '09:00')).toThrow(
      'formato HH:MM',
    );
  });
});
