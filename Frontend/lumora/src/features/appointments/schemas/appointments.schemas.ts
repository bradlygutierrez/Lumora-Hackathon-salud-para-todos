import {
  z,
} from 'zod';

export const appointmentNotesSchema =
  z
    .string()
    .trim()
    .max(
      4000,
      'El motivo de la consulta no puede superar 4000 caracteres.',
    );

export const cancellationReasonSchema =
  z
    .string()
    .trim()
    .max(
      500,
      'El motivo de cancelación no puede superar 500 caracteres.',
    );
