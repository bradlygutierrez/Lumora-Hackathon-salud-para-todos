import { z } from 'zod';

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Usá el formato AAAA-MM-DD.',
  });

const requiredName = z.string().trim().min(1, 'El nombre es obligatorio.').max(180, 'Máximo 180 caracteres.');
const optionalLongText = z.string().max(2000, 'Máximo 2000 caracteres.');

export const conditionFormSchema = z.object({
  nombre: requiredName,
  estado_condicion_id: z.number().int().positive('Seleccioná un estado.'),
  descripcion: optionalLongText,
  fecha_inicio: optionalDate,
  fecha_fin: optionalDate,
  motivo_historial: z.string().max(300, 'Máximo 300 caracteres.'),
  activo: z.boolean(),
});

export type ConditionFormInput = z.input<typeof conditionFormSchema>;
export type ConditionForm = z.output<typeof conditionFormSchema>;

export const allergyFormSchema = z.object({
  nombre: requiredName,
  nivel_severidad_id: z.number().int().positive().optional(),
  estado_condicion_id: z.number().int().positive().optional(),
  observaciones: optionalLongText,
  activo: z.boolean(),
});

export type AllergyFormInput = z.input<typeof allergyFormSchema>;
export type AllergyForm = z.output<typeof allergyFormSchema>;

export const disabilityFormSchema = z.object({
  nombre: requiredName,
  estado_condicion_id: z.number().int().positive().optional(),
  observaciones: optionalLongText,
  activo: z.boolean(),
});

export type DisabilityFormInput = z.input<typeof disabilityFormSchema>;
export type DisabilityForm = z.output<typeof disabilityFormSchema>;

export const medicalHistoryFormSchema = z.object({
  tipo_antecedente_id: z.number().int().positive('Seleccioná un tipo de antecedente.'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria.')
    .max(300, 'Máximo 300 caracteres.'),
  fecha: optionalDate,
  activo: z.boolean(),
});

export type MedicalHistoryFormInput = z.input<typeof medicalHistoryFormSchema>;
export type MedicalHistoryForm = z.output<typeof medicalHistoryFormSchema>;
