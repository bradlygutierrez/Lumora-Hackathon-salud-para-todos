import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

describe('patient-context-store', () => {
  beforeEach(() => {
    usePatientContextStore.getState().clear();
  });

  it('automatically selects the patient own context', () => {
    usePatientContextStore.getState().hydrate(
      'patient',
      [
        {
          patientId: 7,
          displayName: 'Ana López',
          relationship: null,
        },
      ],
    );

    expect(
      usePatientContextStore.getState(),
    ).toMatchObject({
      status: 'ready',
      role: 'patient',
      activePatient: {
        patientId: 7,
      },
    });
  });

  it('requires selection when caregiver has multiple authorized patients', () => {
    usePatientContextStore.getState().hydrate(
      'caregiver',
      [
        {
          patientId: 7,
          displayName: 'Ana López',
          relationship: 'Madre',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
        },
      ],
    );

    expect(
      usePatientContextStore.getState(),
    ).toMatchObject({
      status: 'needs-patient',
      activePatient: null,
    });
  });

  it('refuses a patient id that was not authorized by the backend list', () => {
    usePatientContextStore.getState().hydrate(
      'caregiver',
      [
        {
          patientId: 7,
          displayName: 'Ana López',
          relationship: 'Madre',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
        },
      ],
    );

    const accepted = usePatientContextStore.getState().selectPatient(999);

    expect(accepted).toBe(false);
    expect(usePatientContextStore.getState().activePatient).toBeNull();
  });

  it('accepts a patient id from the authorized list', () => {
    usePatientContextStore.getState().hydrate(
      'caregiver',
      [
        {
          patientId: 7,
          displayName: 'Ana López',
          relationship: 'Madre',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
        },
      ],
    );

    const accepted = usePatientContextStore.getState().selectPatient(8);

    expect(accepted).toBe(true);
    expect(usePatientContextStore.getState().activePatient?.patientId).toBe(8);
  });
});
