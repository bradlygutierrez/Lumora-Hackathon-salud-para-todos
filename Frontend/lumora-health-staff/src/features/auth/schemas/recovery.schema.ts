import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email('Correo inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Token requerido').max(200, 'Token demasiado largo'),
  new_password: z
    .string()
    .min(8, 'Debe tener al menos 8 caracteres')
    .max(128, 'Contraseña demasiado larga'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32, 'Token requerido').max(200, 'Token demasiado largo'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
