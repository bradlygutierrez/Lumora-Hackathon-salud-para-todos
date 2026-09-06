import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Ingresa tu usuario o correo.').max(255),
  password: z.string().min(1, 'Ingresa tu contraseña.').max(128),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
