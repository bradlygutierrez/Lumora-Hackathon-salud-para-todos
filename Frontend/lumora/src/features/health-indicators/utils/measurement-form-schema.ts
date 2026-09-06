import { z } from 'zod';

export const MAX_MEASUREMENT_VALUE_LENGTH = 10;

/**
 * Validación del formulario "Nueva Medición".
 *
 * `valor` llega como string porque React Native no tiene
 * `<input type="number">` -- se valida como texto numérico y se castea a
 * number recién al armar el request (ver MeasurementForm), mismo patrón
 * que ya usa `FormTextField` en el resto de la app.
 */
export const measurementFormSchema = z.object({
  valor: z
    .string()
    .trim()
    .min(1, 'Ingresa un valor.')
    .max(MAX_MEASUREMENT_VALUE_LENGTH, 'Máximo 10 caracteres.')
    .refine(
      (value) => !Number.isNaN(Number(value)),
      'Ingresa un número válido.',
    )
    .refine((value) => Number(value) > 0, 'El valor debe ser mayor a 0.'),
  origen: z.enum(['Manual', 'Dispositivo']),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres.')
    .optional(),
});

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;
