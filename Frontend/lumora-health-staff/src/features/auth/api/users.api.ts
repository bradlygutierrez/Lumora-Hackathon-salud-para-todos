import { apiClient } from '@/src/shared/api/client';
import type { StaffUser } from '../types/auth.types';

export async function getStaffUser(userId: number): Promise<StaffUser> {
  const response = await apiClient.get<StaffUser>(`/usuarios/${userId}`);
  return response.data;
}
