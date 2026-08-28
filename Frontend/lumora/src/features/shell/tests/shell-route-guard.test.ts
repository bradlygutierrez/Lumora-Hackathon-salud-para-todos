import {
  canOpenPatient,
} from '@/features/shell/navigation/shell-route-guard';

describe('canOpenPatient', () => {
  it('allows only ids from the authorized list', () => {
    expect(
      canOpenPatient(
        10,
        [8, 10, 12],
      ),
    ).toBe(true);
  });

  it('rejects arbitrary patient ids', () => {
    expect(
      canOpenPatient(
        999,
        [8, 10, 12],
      ),
    ).toBe(false);
  });
});
