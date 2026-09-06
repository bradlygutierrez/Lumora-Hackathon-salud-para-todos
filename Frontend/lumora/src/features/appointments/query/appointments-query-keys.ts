import {
  patientQueryKeys,
} from '@/features/shell/query/patient-query-keys';

import type {
  ProfessionalFilters,
} from '@/features/appointments/types/appointments.types';

const appointmentsRoot = [
  'appointments',
] as const;

const appointmentPatientKey = (
  patientId: number,
) => patientQueryKeys.appointments(
  patientId,
);

const professionalsRoot = [
  ...appointmentsRoot,
  'professionals',
] as const;

const availabilityRoot = [
  ...appointmentsRoot,
  'availability',
] as const;

export const appointmentsQueryKeys = {
  root: appointmentsRoot,

  patient: (
    patientId: number,
  ) =>
    appointmentPatientKey(patientId),

  list: (
    patientId: number,
  ) =>
    [
      ...appointmentPatientKey(patientId),
      'list',
    ] as const,

  detail: (
    patientId: number,
    appointmentId: number,
  ) =>
    [
      ...appointmentPatientKey(patientId),
      'detail',
      appointmentId,
    ] as const,

  professionalsRoot,

  professionals: (
    filters: ProfessionalFilters,
  ) =>
    [
      ...professionalsRoot,
      filters.q?.trim() ?? '',
      filters.specialty?.trim() ??
        '',
    ] as const,

  availabilityRoot,

  availability: (
    professionalId: number,
    date: string,
  ) =>
    [
      ...availabilityRoot,
      professionalId,
      date,
    ] as const,

  locations: [
    ...appointmentsRoot,
    'locations',
  ] as const,

  appointmentTypes: [
    ...appointmentsRoot,
    'appointment-types',
  ] as const,
};
