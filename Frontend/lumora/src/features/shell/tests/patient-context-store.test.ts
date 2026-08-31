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
          accessLevel: null,
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
          accessLevel: 'read',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
          accessLevel: 'read',
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
          accessLevel: 'read',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
          accessLevel: 'read',
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
          accessLevel: 'read',
        },
        {
          patientId: 8,
          displayName: 'Luis López',
          relationship: 'Padre',
          accessLevel: 'read',
        },
      ],
    );

    const accepted = usePatientContextStore.getState().selectPatient(8);

    expect(accepted).toBe(true);
    expect(usePatientContextStore.getState().activePatient?.patientId).toBe(8);
  });

  // --- A12: revalidación / revocación en vivo -------------------------------

  describe('syncAvailablePatients', () => {
    it('clears the active patient and asks for a new selection when access was revoked', () => {
      usePatientContextStore.getState().hydrate(
        'caregiver',
        [
          {
            patientId: 7,
            displayName: 'Ana López',
            relationship: 'Madre',
            accessLevel: 'read',
          },
          {
            patientId: 8,
            displayName: 'Luis López',
            relationship: 'Padre',
            accessLevel: 'read',
          },
        ],
      );
      usePatientContextStore.getState().selectPatient(8);

      // El backend ya no incluye al paciente 8 -- el paciente revocó
      // la relación mientras el cuidador tenía sesión activa.
      usePatientContextStore.getState().syncAvailablePatients(
        'caregiver',
        [
          {
            patientId: 7,
            displayName: 'Ana López',
            relationship: 'Madre',
            accessLevel: 'read',
          },
        ],
      );

      const state = usePatientContextStore.getState();
      expect(state.status).toBe('needs-patient');
      expect(state.activePatient).toBeNull();
      expect(state.availablePatients).toEqual([
        {
          patientId: 7,
          displayName: 'Ana López',
          relationship: 'Madre',
          accessLevel: 'read',
        },
      ]);
      expect(state.errorMessage).toMatch(/ya no está disponible/i);
    });

    it('keeps the active patient untouched when it is still authorized', () => {
      usePatientContextStore.getState().hydrate(
        'caregiver',
        [
          {
            patientId: 7,
            displayName: 'Ana López',
            relationship: 'Madre',
            accessLevel: 'read',
          },
        ],
      );
      usePatientContextStore.getState().selectPatient(7);

      // Refresco periódico: la relación sigue activa, pero el nivel de
      // acceso cambió (el paciente le dio permiso de escritura).
      usePatientContextStore.getState().syncAvailablePatients(
        'caregiver',
        [
          {
            patientId: 7,
            displayName: 'Ana López',
            relationship: 'Madre',
            accessLevel: 'write',
          },
        ],
      );

      const state = usePatientContextStore.getState();
      expect(state.status).toBe('ready');
      expect(state.activePatient).toMatchObject({
        patientId: 7,
        accessLevel: 'write',
      });
      expect(state.errorMessage).toBeNull();
    });

    it('ignores a sync for a role that no longer matches the current session', () => {
      usePatientContextStore.getState().hydrate(
        'caregiver',
        [
          {
            patientId: 7,
            displayName: 'Ana López',
            relationship: 'Madre',
            accessLevel: 'read',
          },
        ],
      );
      usePatientContextStore.getState().selectPatient(7);

      usePatientContextStore.getState().syncAvailablePatients(
        'patient',
        [],
      );

      const state = usePatientContextStore.getState();
      expect(state.role).toBe('caregiver');
      expect(state.activePatient?.patientId).toBe(7);
    });
  });
});
