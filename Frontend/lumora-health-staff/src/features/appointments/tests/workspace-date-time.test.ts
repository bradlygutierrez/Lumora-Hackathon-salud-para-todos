import {
  formatWorkspaceDateTime,
  formatWorkspaceTime,
} from '../utils/workspace-date-time';

describe('workspace date/time formatting', () => {
  // Regresión: este archivo forzaba timeZone: 'UTC', restándole el offset
  // local a la hora real de la cita -- eso hacía que HealthStaff mostrara
  // una hora de cita distinta a la que Lumora mostraba para la MISMA cita.
  // Se pasa 'America/Managua' explícitamente (en vez de reasignar
  // process.env.TZ en runtime) porque esa reasignación no es confiable
  // entre plataformas: funcionaba en Windows pero no en el runner de CI
  // (Ubuntu), donde Intl.DateTimeFormat seguía resolviendo UTC.
  const TZ = 'America/Managua';

  it('converts to the device local time instead of showing the raw UTC clock', () => {
    // 08:00 UTC es 02:00 a.m. en Nicaragua (UTC-6) -- si esto mostrara
    // "08:00" seguiría restando el offset local, igual que antes.
    expect(formatWorkspaceTime('2026-09-07T08:00:00Z', TZ)).toMatch(/02:00/);
    expect(formatWorkspaceTime('2026-09-07T08:45:00Z', TZ)).toMatch(/02:45/);
    // dateStyle/timeStyle no rellena la hora con cero a la izquierda,
    // a diferencia de hour: '2-digit' -- por eso "2:00" y no "02:00" acá.
    expect(formatWorkspaceDateTime('2026-09-07T08:00:00Z', TZ)).toMatch(/2:00/);
  });

  it('keeps the empty workspace state explicit', () => {
    expect(formatWorkspaceDateTime(null)).toBe('No disponible');
  });
});
