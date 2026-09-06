import { apiClient } from '@/src/shared/api/client';
import type { StaffUser } from '../types/auth.types';

export type UserPage = { items: StaffUser[]; total: number; limit: number; offset: number };
export type UserCreatePayload = {
  email: string;
  username: string;
  password: string;
  persona: { nombres: string; apellidos: string; telefono?: string };
};

export async function getCurrentStaffUser(accessToken: string): Promise<StaffUser> {
  const response = await apiClient.get<StaffUser>('/auth/me', {
    headers: { Authorization: `bearer ${accessToken}` },
  });
  return response.data;
}

export async function listUsers(): Promise<UserPage> {
  const response = await apiClient.get<UserPage>('/usuarios', { params: { limit: 100, offset: 0 } });
  return response.data;
}

export async function createAdminUser(payload: UserCreatePayload): Promise<StaffUser> {
  const response = await apiClient.post<StaffUser>('/usuarios/admin', payload);
  return response.data;
}

export async function resendPasswordReset(userId: number): Promise<void> {
  await apiClient.post(`/usuarios/${userId}/password-reset`);
}
