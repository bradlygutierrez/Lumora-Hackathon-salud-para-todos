import { z } from 'zod';

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.email('Correo inválido').optional());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

export const patientRegistrationSchema = z.object({
  nombres: z.string().trim().min(1, 'Ingresá los nombres').max(100),
  apellidos: z.string().trim().min(1, 'Ingresá los apellidos').max(100),
  email: optionalEmail,
  fecha_nacimiento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD'),
  telefono: z.string().trim().min(5, 'Ingresá un teléfono válido').max(30),
  sexo_id: z.number({ error: 'Seleccioná el sexo' }).int().positive('Seleccioná el sexo'),
  tipo_sangre_id: z.number().int().positive().optional(),
  alergias: optionalText(2000),
  direccion: z.string().trim().min(1, 'Ingresá la dirección').max(200),
  ciudad: z.string().trim().min(1, 'Ingresá la ciudad').max(100),
  departamento: optionalText(100),
  contacto_nombre: z.string().trim().min(1, 'Ingresá el contacto de emergencia').max(150),
  contacto_parentesco: z.string().trim().min(1, 'Ingresá el parentesco').max(50),
  contacto_telefono: z.string().trim().min(1, 'Ingresá el teléfono del contacto').max(30),
});

export type PatientRegistrationInput = z.input<typeof patientRegistrationSchema>;
export type PatientRegistrationForm = z.output<typeof patientRegistrationSchema>;
