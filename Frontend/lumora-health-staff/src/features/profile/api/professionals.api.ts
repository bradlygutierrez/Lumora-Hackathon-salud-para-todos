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
