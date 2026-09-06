import { z } from 'zod';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validación del formulario "+ Añadir Nuevo Recordatorio" (A10).
 *
 * `tipo` es un selector explícito ("Rutina simple" vs "Con meta y
 * progreso") -- antes se infería de si `objetivoCantidad` venía lleno o
 * vacío, lo cual confundía a la usuaria ("¿cómo sé que dejar esto vacío
 * hace X cosa?"). Ahora se elige el tipo primero y el formulario pide lo
 * que corresponde:
 *
 * - "Rutina simple" -> una sola `hora` (ej. Vitamina D a las 21:00).
 * - "Con meta y progreso" -> varias `horas` del día (ej. Beber Agua a
 *   las 08:00/12:00/16:00/20:00), cada una repartida como un
 *   RecordatorioHorario en el backend.
 */
export const newReminderFormSchema = z
  .object({
    tipo: z.enum(['rutina', 'progreso']),
    titulo: z.string().trim().min(1, 'Ingresa un título.').max(150, 'Máximo 150 caracteres.'),
    mensaje: z
      .string()
      .trim()
      .min(1, 'Ingresa instrucciones o un mensaje.')
      .max(500, 'Máximo 500 caracteres.'),
    // Solo se usa cuando tipo === 'rutina'.
    hora: z.string().trim().optional(),
    // Solo se usa cuando tipo === 'progreso' -- se arma con "+ Agregar
    // hora" en vez de un solo campo de texto (ver NewReminderForm).
    horas: z.array(z.string().regex(HORA_REGEX)).optional(),
    objetivoCantidad: z.string().trim().optional(),
    unidad: z.string().trim().max(30, 'Máximo 30 caracteres.').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'rutina') {
      const hora = data.hora?.trim() ?? '';
      if (!HORA_REGEX.test(hora)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Usa el formato HH:MM (24 horas).',
          path: ['hora'],
        });
      }
      return;
    }

    // tipo === 'progreso'
    if (!data.horas || data.horas.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agrega al menos una hora del día.',
        path: ['horas'],
      });
    }

    const objetivoRaw = data.objetivoCantidad?.trim() ?? '';
    const esNumeroValido = objetivoRaw !== '' && !Number.isNaN(Number(objetivoRaw));

    if (!esNumeroValido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresa un objetivo válido.',
        path: ['objetivoCantidad'],
      });
    } else if (Number(objetivoRaw) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El objetivo debe ser mayor a 0.',
        path: ['objetivoCantidad'],
      });
    }

    if (!data.unidad || data.unidad.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresa la unidad (ej. Litros).',
        path: ['unidad'],
      });
    }
  });

export type NewReminderFormValues = z.infer<typeof newReminderFormSchema>;
