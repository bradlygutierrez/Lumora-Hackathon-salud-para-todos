import { z } from 'zod';

const numericField = (label: string, min: number, max: number, integer = false) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || Number.isFinite(Number(value)), `${label}: ingresá un número válido.`)
    .refine((value) => value === '' || Number(value) >= min, `${label}: mínimo ${min}.`)
    .refine((value) => value === '' || Number(value) <= max, `${label}: máximo ${max}.`)
    .refine((value) => value === '' || !integer || Number.isInteger(Number(value)), `${label}: debe ser un número entero.`);

export const vitalSignsFormSchema = z
  .object({
    temperatura_c: numericField('Temperatura', 30, 45),
    frecuencia_cardiaca: numericField('Frecuencia cardiaca', 20, 250, true),
    frecuencia_respiratoria: numericField('Frecuencia respiratoria', 5, 80, true),
    presion_sistolica: numericField('Presión sistólica', 50, 260, true),
    presion_diastolica: numericField('Presión diastólica', 30, 160, true),
    saturacion_oxigeno: numericField('Saturación de oxígeno', 50, 100, true),
    peso_kg: numericField('Peso', 1, 500),
    talla_cm: numericField('Talla', 30, 250),
    glucosa_mg_dl: numericField('Glucosa', 20, 800, true),
  })
  .refine((values) => Object.values(values).some((value) => value !== ''), {
    message: 'Ingresá al menos un signo vital.',
    path: ['temperatura_c'],
  });

export type VitalSignsForm = z.infer<typeof vitalSignsFormSchema>;
