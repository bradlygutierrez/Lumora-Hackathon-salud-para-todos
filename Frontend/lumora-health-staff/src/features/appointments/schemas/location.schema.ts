import { z } from 'zod';

export const locationSchema = z.object({
  nombre: z.string().min(1, 'Ingresá un nombre para el consultorio'),
  direccion: z.string().min(1, 'Ingresá la dirección'),
  consultorio: z.string(),
});

export type LocationFormInput = z.input<typeof locationSchema>;
export type LocationForm = z.output<typeof locationSchema>;
