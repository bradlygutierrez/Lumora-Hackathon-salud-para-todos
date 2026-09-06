import { z } from 'zod';

/**
 * La política replica `validate_password_policy()` del backend B08:
 * 8–128 caracteres, mayúscula, minúscula, número y símbolo.
 *
 * El backend sigue siendo la autoridad final; esta validación existe para
 * dar feedback inmediato antes de enviar el formulario.
 */
const strongPassword = z
  .string()
  .min(8, 'Debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña es demasiado larga.')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula.')
  .regex(/[a-z]/, 'Incluye al menos una minúscula.')
  .regex(/\d/, 'Incluye al menos un número.')
  .regex(/[^A-Za-z0-9]/, 'Incluye al menos un símbolo.');

export const loginSchema = z.object({
  /** El backend permite username o email en el campo `login`. */
  login: z.string().trim().min(1, 'Ingresa tu usuario o correo.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

/** Paso 1 de 4: credenciales de la cuenta. */
export const registerAccountSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo 3 caracteres.')
      .max(50, 'Máximo 50 caracteres.'),
    email: z.string().trim().toLowerCase().email('Correo inválido.'),
    phone: z
      .string()
      .trim()
      .min(5, 'Teléfono inválido.')
      .max(30, 'Teléfono demasiado largo.'),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

/**
 * Paso 2 de 4.
 *
 * Nombres/apellidos y sexo son obligatorios porque así lo exige
 * PatientRegistrationRequest, aunque el Figma original no lo mostraba igual.
 */
export const registerPersonalSchema = z.object({
  firstNames: z.string().trim().min(1, 'Ingresa tus nombres.').max(100),
  lastNames: z.string().trim().min(1, 'Ingresa tus apellidos.').max(100),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa formato AAAA-MM-DD.'),
  sexId: z.number().int().positive('Selecciona una opción.'),
  bloodTypeId: z.number().int().positive().nullable(),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Ingresa tu dirección.')
    .max(200),
  city: z.string().trim().min(1, 'Ingresa la ciudad.').max(100),
  department: z.string().trim().max(100),
  country: z.string().trim().min(1, 'Ingresa el país.').max(100),
  postalCode: z.string().trim().max(20),
});

/** Paso 3 de 4: backend recibe relationship como texto, no tipo_relacion_id. */
export const registerEmergencySchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre.').max(150),
  relationship: z.string().trim().min(1, 'Ingresa la relación.').max(50),
  phone: z.string().trim().min(5, 'Teléfono inválido.').max(30),
});

/** Paso 4. El backend requiere literalmente `true` en ambos campos. */
export const registerReviewSchema = z.object({
  acceptTerms: z.literal(true, {
    error: 'Debes aceptar los términos.',
  }),
  acceptPrivacy: z.literal(true, {
    error: 'Debes aceptar la política de privacidad.',
  }),
});

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Ingresa los 6 dígitos.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Token de recuperación inválido.'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export const mfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Ingresa los 6 dígitos.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual.'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterAccountForm = z.infer<typeof registerAccountSchema>;
export type RegisterPersonalForm = z.infer<typeof registerPersonalSchema>;
export type RegisterEmergencyForm = z.infer<typeof registerEmergencySchema>;
export type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type MfaForm = z.infer<typeof mfaSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
