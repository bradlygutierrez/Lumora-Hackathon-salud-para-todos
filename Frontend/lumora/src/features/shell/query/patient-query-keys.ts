export const patientQueryKeys = {
  all: ['patient'] as const,

  scope: (patientId: number) =>
    [...patientQueryKeys.all, patientId] as const,

  health: (patientId: number) =>
    [...patientQueryKeys.scope(patientId), 'health'] as const,

  appointments: (patientId: number) =>
    [...patientQueryKeys.scope(patientId), 'appointments'] as const,

  medication: (patientId: number) =>
    [...patientQueryKeys.scope(patientId), 'medication'] as const,

  profile: (patientId: number) =>
    [...patientQueryKeys.scope(patientId), 'profile'] as const,
};
