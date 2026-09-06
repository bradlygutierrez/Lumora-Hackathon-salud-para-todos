import { z } from 'zod';

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Usá el formato AAAA-MM-DD.',
  });

export const diagnosisFormSchema = z.object({
  tipo_diagnostico_id: z.number().int().positive('Seleccioná un tipo de diagnóstico.'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(700, 'Máximo 700 caracteres.'),
  es_principal: z.boolean(),
  fecha_diagnostico: optionalDate,
  activo: z.boolean(),
});

export type DiagnosisFormInput = z.input<typeof diagnosisFormSchema>;
export type DiagnosisForm = z.output<typeof diagnosisFormSchema>;
