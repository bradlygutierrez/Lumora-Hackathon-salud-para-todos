import { apiClient } from '@/src/shared/api/client';
import type { MyPatient } from '../types/my-patient.types';

export async function listMyPatients(): Promise<MyPatient[]> {
  const response = await apiClient.get<MyPatient[]>('/profesional/me/pacientes');
  return response.data;
}
