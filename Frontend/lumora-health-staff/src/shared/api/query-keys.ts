export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    sessions: ['auth', 'sessions'] as const,
    mfaMethods: ['auth', 'mfa', 'methods'] as const,
  },
  account: {
    me: ['account', 'me'] as const,
  },
  clinical: {
    all: ['clinical'] as const,
    patients: () => [...queryKeys.clinical.all, 'patients'] as const,
    patientSummary: (patientId: number) =>
      [...queryKeys.clinical.patients(), patientId, 'summary'] as const,
    medicalRecordDocument: (patientId: number) =>
      [...queryKeys.clinical.patients(), patientId, 'document'] as const,
    medicalRecordTimeline: (recordId: number) =>
      [...queryKeys.clinical.all, 'records', recordId, 'timeline'] as const,
    consultations: {
      all: () => [...queryKeys.clinical.all, 'consultations'] as const,
      list: (params: object) =>
        [...queryKeys.clinical.all, 'consultations', 'list', params] as const,
      forRecord: (recordId: number, params: object) =>
        [...queryKeys.clinical.all, 'records', recordId, 'consultations', params] as const,
      detail: (consultationId: number) =>
        [...queryKeys.clinical.all, 'consultations', consultationId] as const,
      vitalSigns: (consultationId: number, params: object) =>
        [...queryKeys.clinical.all, 'consultations', consultationId, 'vital-signs', params] as const,
      notes: (consultationId: number, params: object) =>
        [...queryKeys.clinical.all, 'consultations', consultationId, 'notes', params] as const,
      reasons: (params: object) =>
        [...queryKeys.clinical.all, 'catalogs', 'consultation-reasons', params] as const,
    },
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
      currentByPerson: (personId: number) =>
        [...queryKeys.clinical.all, 'professionals', 'current-person', personId] as const,
    },
  },
} as const;
