import { apiClient } from '@/src/shared/api/client';
import type { LoginRequest, TokenPairResponse } from '../types/auth.types';

export async function loginStaff(data: LoginRequest): Promise<TokenPairResponse> {
  const response = await apiClient.post<TokenPairResponse>('/auth/login', data);
  return response.data;
}

export async function refreshStaffSession(refreshToken: string): Promise<TokenPairResponse> {
  const response = await apiClient.post<TokenPairResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
}

export async function logoutStaff(): Promise<void> {
  await apiClient.post('/auth/logout');
}
