export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
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
  },
} as const;
