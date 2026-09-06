import { formatItemTime } from '@/features/reminders/utils/format-time';

// `new Date(year, month, day, hour, minute)` construye en la zona
// horaria LOCAL de donde corre el test (igual que `formatItemTime`, que
// tampoco fija una `timeZone`) -- así el test da el mismo resultado sin
// importar en qué zona horaria corra (sandbox, CI, la PC de Ana), a
// diferencia de construir con un offset ISO fijo tipo "-06:00".
describe('formatItemTime', () => {
  it('formatea las 10:00 en formato 12h con AM', () => {
    expect(formatItemTime(new Date(2026, 7, 29, 10, 0))).toBe('10:00 AM');
  });

  it('formatea las 15:30 como 3:30 PM', () => {
    expect(formatItemTime(new Date(2026, 7, 29, 15, 30))).toBe('3:30 PM');
  });
});
