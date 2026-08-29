import {
  env,
} from '@/config/env';

import type {
  AppointmentCatalogItem,
  AppointmentResponse,
} from '@/features/appointments/types/appointments.types';

export function normalizeAppointmentText(
  value: string | null | undefined,
): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .trim()
    .toLocaleLowerCase('es');
}

export function appointmentStatusName(
  appointment: AppointmentResponse,
): string {
  return (
    appointment.status?.nombre ??
    'Sin estado'
  );
}

export function appointmentTypeName(
  appointment: AppointmentResponse,
): string {
  return (
    appointment.appointment_type
      ?.nombre ??
    'Consulta médica'
  );
}

export function isCancelledAppointment(
  appointment: AppointmentResponse,
): boolean {
  return (
    normalizeAppointmentText(
      appointment.status?.nombre,
    ) === 'cancelada'
  );
}

export function isCompletedAppointment(
  appointment: AppointmentResponse,
): boolean {
  return (
    normalizeAppointmentText(
      appointment.status?.nombre,
    ) === 'completada'
  );
}

export function canManageAppointment(
  appointment: AppointmentResponse,
  now = new Date(),
): boolean {
  if (
    isCancelledAppointment(
      appointment,
    ) ||
    isCompletedAppointment(
      appointment,
    )
  ) {
    return false;
  }

  return (
    new Date(
      appointment.fin,
    ).getTime() >=
    now.getTime()
  );
}

export function splitAppointments(
  appointments: AppointmentResponse[],
  now = new Date(),
): {
  upcoming: AppointmentResponse[];
  previous: AppointmentResponse[];
} {
  const timestamp =
    now.getTime();

  const upcoming =
    appointments
      .filter(
        (appointment) =>
          !isCancelledAppointment(
            appointment,
          ) &&
          new Date(
            appointment.fin,
          ).getTime() >=
          timestamp,
      )
      .sort(
        (a, b) =>
          new Date(
            a.inicio,
          ).getTime() -
          new Date(
            b.inicio,
          ).getTime(),
      );

  const previous =
    appointments
      .filter(
        (appointment) =>
          isCancelledAppointment(
            appointment,
          ) ||
          new Date(
            appointment.fin,
          ).getTime() <
          timestamp,
      )
      .sort(
        (a, b) =>
          new Date(
            b.inicio,
          ).getTime() -
          new Date(
            a.inicio,
          ).getTime(),
      );

  return {
    upcoming,
    previous,
  };
}

export function formatAppointmentDate(
  iso: string,
): string {
  return new Intl.DateTimeFormat(
    'es-NI',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(
    new Date(iso),
  );
}

export function formatAppointmentTime(
  iso: string,
): string {
  return new Intl.DateTimeFormat(
    'es-NI',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(
    new Date(iso),
  );
}

export function formatAppointmentTimeRange(
  start: string,
  end: string,
): string {
  return `${formatAppointmentTime(
    start,
  )} - ${formatAppointmentTime(
    end,
  )}`;
}

export function toDateKey(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

export function dateKeyToDate(
  value: string,
): Date {
  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );
}

export function todayDateKey(): string {
  return toDateKey(
    new Date(),
  );
}

export function isPastDateKey(
  value: string,
): boolean {
  return (
    value <
    todayDateKey()
  );
}

export function isPhysicalAppointmentType(
  item:
    | AppointmentCatalogItem
    | null
    | undefined,
): boolean {
  return (
    normalizeAppointmentText(
      item?.nombre,
    ) === 'presencial'
  );
}

export function isVirtualAppointmentType(
  item:
    | AppointmentCatalogItem
    | null
    | undefined,
): boolean {
  const normalized =
    normalizeAppointmentText(
      item?.nombre,
    );

  return (
    normalized === 'virtual' ||
    normalized ===
      'telemedicina'
  );
}

export function resolveMediaUrl(
  uri: string | null | undefined,
): string | null {
  if (!uri) {
    return null;
  }

  if (
    /^(https?:|file:|content:|data:|blob:)/i.test(
      uri,
    )
  ) {
    return uri;
  }

  return `${env.apiUrl}${
    uri.startsWith('/')
      ? ''
      : '/'
  }${uri}`;
}

export function requirePatientId(
  patient:
    | {
        patientId: number;
      }
    | null
    | undefined,
): number {
  if (!patient) {
    throw new Error(
      'No existe un patientContext activo.',
    );
  }

  return patient.patientId;
}
