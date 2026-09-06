import { z } from 'zod';

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Usá el formato AAAA-MM-DD.',
  });

const positiveIntegerText = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Ingresá un número entero mayor a 0.')
  .refine((value) => Number(value) > 0, {
    message: 'El valor debe ser mayor a 0.',
  });

export const prescriptionDetailFormSchema = z.object({
  medicamento_id: z.string().trim().min(1, 'Seleccioná un medicamento.'),
  unidad_medida_id: z.number().int().positive('Seleccioná una unidad.'),
  via_administracion_id: z.number().int().positive('Seleccioná una vía.'),
  dosis: z.string().trim().min(1, 'La dosis es obligatoria.'),
  frecuencia: z.string().trim().min(1, 'La frecuencia es obligatoria.'),
  duracion_dias: positiveIntegerText,
  cantidad_total: positiveIntegerText,
  instrucciones: z.string(),
});

export const prescriptionCreateFormSchema = z.object({
  estado_id: z.number().int().positive('Seleccioná un estado de receta.'),
  titulo: z.string().max(150, 'Máximo 150 caracteres.'),
  consulta_id: z.number().int().positive().optional(),
  vigencia_hasta: optionalDate,
  observaciones: z.string(),
  detalles: z
    .array(prescriptionDetailFormSchema)
    .min(1, 'Agregá al menos un medicamento.'),
});

export const prescriptionHeaderFormSchema = z.object({
  estado_id: z.number().int().positive('Seleccioná un estado de receta.'),
  titulo: z.string().max(150, 'Máximo 150 caracteres.'),
  vigencia_hasta: optionalDate,
  observaciones: z.string(),
});

export type PrescriptionDetailForm = z.infer<typeof prescriptionDetailFormSchema>;
export type PrescriptionCreateForm = z.infer<typeof prescriptionCreateFormSchema>;
export type PrescriptionHeaderForm = z.infer<typeof prescriptionHeaderFormSchema>;
