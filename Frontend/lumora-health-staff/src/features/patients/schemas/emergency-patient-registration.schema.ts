import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD').optional());

export const emergencyPatientRegistrationSchema = z
  .object({
    nombres: z.string().trim().min(1, 'Ingresá al menos un nombre').max(100),
    apellidos: z.string().trim().min(1, 'Ingresá al menos un apellido, aunque sea provisional').max(100),
    fecha_nacimiento: optionalDate,
    telefono: optionalText(30),
    sexo_id: z.number().int().positive().optional(),
    motivo_consulta: z.string().trim().min(1, 'Describí el motivo de la atención').max(600),
    contacto_nombre: optionalText(150),
    contacto_parentesco: optionalText(50),
    contacto_telefono: optionalText(30),
  })
  .refine(
    (values) => {
      const provided = [values.contacto_nombre, values.contacto_parentesco, values.contacto_telefono].filter(
        (value) => value !== undefined,
      ).length;
      return provided === 0 || provided === 3;
    },
    {
      message: 'Completá nombre, parentesco y teléfono del acompañante, o dejalos todos vacíos',
      path: ['contacto_nombre'],
    },
  );

export type EmergencyPatientRegistrationInput = z.input<typeof emergencyPatientRegistrationSchema>;
export type EmergencyPatientRegistrationForm = z.output<typeof emergencyPatientRegistrationSchema>;
