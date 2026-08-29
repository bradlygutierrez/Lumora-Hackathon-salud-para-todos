import { apiClient } from '@/src/shared/api/client';
import type { Page, Professional } from '../types/professional.types';

export async function listProfessionals(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<Page<Professional>> {
  const response = await apiClient.get<Page<Professional>>('/profesionales', { params });
  return response.data;
}

export async function getProfessional(professionalId: number): Promise<Professional> {
  const response = await apiClient.get<Professional>(`/profesionales/${professionalId}`);
  return response.data;
}

export async function findProfessionalByPersonId(
  personId: number,
): Promise<Professional | null> {
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await listProfessionals({ limit, offset });
    const professional = page.items.find((item) => item.persona.id === personId);
    if (professional) {
      return professional;
    }

    const nextOffset = offset + page.items.length;
    if (page.items.length === 0 || nextOffset >= page.total) {
      return null;
    }
    offset = nextOffset;
  }
}
