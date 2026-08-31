import {
  formatWorkspaceDateTime,
  formatWorkspaceTime,
} from '../utils/workspace-date-time';

describe('workspace date/time formatting', () => {
  it('preserves the backend scheduling clock instead of converting to the device timezone', () => {
    expect(formatWorkspaceTime('2026-09-07T08:00:00Z')).toMatch(/0?8:00/);
    expect(formatWorkspaceTime('2026-09-07T08:45:00Z')).toMatch(/0?8:45/);
    expect(formatWorkspaceDateTime('2026-09-07T08:00:00Z')).toMatch(/0?8:00/);
  });

  it('keeps the empty workspace state explicit', () => {
    expect(formatWorkspaceDateTime(null)).toBe('No disponible');
  });
});