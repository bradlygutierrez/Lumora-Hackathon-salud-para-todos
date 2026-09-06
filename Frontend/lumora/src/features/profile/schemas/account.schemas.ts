import { z } from 'zod';

export const accountEditSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.email('Ingresa un correo válido.'),
  firstNames: z.string().trim().min(1).max(100),
  lastNames: z.string().trim().min(1).max(100),
  birthDate: z.union([z.literal(''), z.iso.date()]),
  phone: z.string().trim().max(30),
  sexId: z.number().int().positive().nullable(),
});

export type AccountEditForm = z.infer<typeof accountEditSchema>;

export const emergencyContactSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  parentesco: z.string().trim().min(1).max(50),
  telefono: z.string().trim().min(1).max(30),
  email: z.union([z.literal(''), z.email('Ingresa un correo válido.')]),
});

export type EmergencyContactForm = z.infer<typeof emergencyContactSchema>;
