import { z } from 'zod';

const optionalClinicalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value.trim())
    .optional();

export const consultationFormSchema = z.object({
  motivo_consulta_id: z.number().int().positive().optional(),
  fecha_consulta: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || !Number.isNaN(Date.parse(value)),
      'Usá una fecha y hora válidas en formato ISO.',
    ),
  motivo: z
    .string()
    .trim()
    .min(1, 'El motivo de consulta es requerido.')
    .max(600, 'Máximo 600 caracteres.'),
  sintomas: optionalClinicalText(4000),
  evaluacion: optionalClinicalText(4000),
  indicaciones: optionalClinicalText(4000),
  observaciones: optionalClinicalText(4000),
  activo: z.boolean(),
});

export type ConsultationFormInput = z.input<typeof consultationFormSchema>;
export type ConsultationForm = z.output<typeof consultationFormSchema>;
