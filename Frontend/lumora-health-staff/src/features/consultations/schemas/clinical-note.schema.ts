import { z } from 'zod';

export const clinicalNoteFormSchema = z.object({
  contenido: z.string().trim().min(1, 'La nota clínica no puede estar vacía.').max(5000, 'Máximo 5000 caracteres.'),
  activo: z.boolean(),
});

export type ClinicalNoteForm = z.infer<typeof clinicalNoteFormSchema>;
