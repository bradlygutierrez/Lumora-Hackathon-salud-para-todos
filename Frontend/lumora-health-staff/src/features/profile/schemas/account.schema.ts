import { z } from 'zod';

export const editProfileSchema = z.object({
  first_names: z.string().min(1, 'Ingresá tu nombre'),
  last_names: z.string().min(1, 'Ingresá tu apellido'),
  email: z.string().email('Ingresá un correo válido'),
  phone: z.string(),
});

export type EditProfileFormInput = z.input<typeof editProfileSchema>;
export type EditProfileForm = z.output<typeof editProfileSchema>;
