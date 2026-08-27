import type { Person } from '@/src/features/auth/types/auth.types';

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type Professional = {
  id: number;
  especialidad: string;
  numero_licencia: string;
  persona: Person;
};
