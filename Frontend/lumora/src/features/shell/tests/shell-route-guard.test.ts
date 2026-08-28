import {
  canOpenPatient,
  canOpenWithoutPatientContext,
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

describe('canOpenWithoutPatientContext', () => {
  it('allows the caregiver patient selector', () => {
    expect(
      canOpenWithoutPatientContext(
        '/select-patient',
      ),
    ).toBe(true);
  });

  it('allows the caregiver to open their own profile', () => {
    expect(
      canOpenWithoutPatientContext(
        '/profile',
      ),
    ).toBe(true);
  });

  it('allows the security center without an active patient', () => {
    expect(
      canOpenWithoutPatientContext(
        '/security',
      ),
    ).toBe(true);

    expect(
      canOpenWithoutPatientContext(
        '/security/mfa',
      ),
    ).toBe(true);

    expect(
      canOpenWithoutPatientContext(
        '/security/sessions',
      ),
    ).toBe(true);
  });

  it('continues protecting patient-scoped routes', () => {
    expect(
      canOpenWithoutPatientContext(
        '/health',
      ),
    ).toBe(false);

    expect(
      canOpenWithoutPatientContext(
        '/appointments',
      ),
    ).toBe(false);

    expect(
      canOpenWithoutPatientContext(
        '/medication',
      ),
    ).toBe(false);
  });
});