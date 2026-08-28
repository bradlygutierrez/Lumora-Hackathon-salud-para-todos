import { apiClient } from '@/src/shared/api/client';
import type { StaffUser } from '../types/auth.types';

export async function getCurrentStaffUser(accessToken: string): Promise<StaffUser> {
  const response = await apiClient.get<StaffUser>('/auth/me', {
    headers: { Authorization: `bearer ${accessToken}` },
  });
  return response.data;
}
