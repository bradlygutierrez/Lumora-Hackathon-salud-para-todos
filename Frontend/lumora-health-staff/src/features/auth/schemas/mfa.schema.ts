import { z } from 'zod';

export const mfaChallengeSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida').max(128),
});

export const mfaVerifySchema = z.object({
  challenge_token: z.string().min(32, 'Desafío requerido').max(200),
  code: z.string().regex(/^\d{6}$/, 'Debe tener 6 dígitos'),
});

export const mfaRecoverySchema = z.object({
  challenge_token: z.string().min(32, 'Desafío requerido').max(200),
  recovery_code: z.string().min(8, 'Código requerido').max(100),
});

export type MfaChallengeFormValues = z.infer<typeof mfaChallengeSchema>;
export type MfaVerifyFormValues = z.infer<typeof mfaVerifySchema>;
export type MfaRecoveryFormValues = z.infer<typeof mfaRecoverySchema>;
