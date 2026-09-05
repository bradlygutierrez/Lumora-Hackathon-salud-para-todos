import {
  formatWorkspaceDateTime,
  formatWorkspaceTime,
} from '../utils/workspace-date-time';

describe('workspace date/time formatting', () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    // Regresión: este archivo forzaba timeZone: 'UTC', restándole el
    // offset local a la hora real de la cita -- eso hacía que HealthStaff
    // mostrara una hora de cita distinta a la que Lumora mostraba para la
    // MISMA cita. Fijar la zona a la de Nicaragua hace la prueba
    // determinística sin importar en qué máquina/zona corra.
    process.env.TZ = 'America/Managua';
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it('converts to the device local time instead of showing the raw UTC clock', () => {
    // 08:00 UTC es 02:00 a.m. en Nicaragua (UTC-6) -- si esto mostrara
    // "08:00" seguiría restando el offset local, igual que antes.
    expect(formatWorkspaceTime('2026-09-07T08:00:00Z')).toMatch(/02:00/);
    expect(formatWorkspaceTime('2026-09-07T08:45:00Z')).toMatch(/02:45/);
    // dateStyle/timeStyle no rellena la hora con cero a la izquierda,
    // a diferencia de hour: '2-digit' -- por eso "2:00" y no "02:00" acá.
    expect(formatWorkspaceDateTime('2026-09-07T08:00:00Z')).toMatch(/2:00/);
  });

  it('keeps the empty workspace state explicit', () => {
    expect(formatWorkspaceDateTime(null)).toBe('No disponible');
  });
});
