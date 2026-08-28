export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    sessions: ['auth', 'sessions'] as const,
    mfaMethods: ['auth', 'mfa', 'methods'] as const,
  },
  clinical: {
    all: ['clinical'] as const,
    patients: () => [...queryKeys.clinical.all, 'patients'] as const,
    patientSummary: (patientId: number) =>
      [...queryKeys.clinical.patients(), patientId, 'summary'] as const,
    medicalRecordTimeline: (recordId: number) =>
      [...queryKeys.clinical.all, 'records', recordId, 'timeline'] as const,
    consultations: () => [...queryKeys.clinical.all, 'consultations'] as const,
    diagnoses: () => [...queryKeys.clinical.all, 'diagnoses'] as const,
    conditions: () => [...queryKeys.clinical.all, 'conditions'] as const,
    patientsDirectory: {
      list: (params: { search?: string; sexo_id?: number; tipo_sangre_id?: number; limit: number; offset: number }) =>
        [...queryKeys.clinical.all, 'patients-directory', params] as const,
      detail: (patientId: number) =>
        [...queryKeys.clinical.all, 'patients-directory', patientId] as const,
      family: (patientId: number) =>
        [...queryKeys.clinical.all, 'patients-directory', patientId, 'family'] as const,
      clinicalSummary: (patientId: number) =>
        [...queryKeys.clinical.all, 'patients-directory', patientId, 'clinical-summary'] as const,
      sexes: ['clinical', 'catalogs', 'sexes'] as const,
      bloodTypes: ['clinical', 'catalogs', 'blood-types'] as const,
    },
    professionals: {
      list: (params: { limit: number; offset: number }) =>
        [...queryKeys.clinical.all, 'professionals', params] as const,
      detail: (professionalId: number) =>
        [...queryKeys.clinical.all, 'professionals', professionalId] as const,
    },
  },
} as const;
