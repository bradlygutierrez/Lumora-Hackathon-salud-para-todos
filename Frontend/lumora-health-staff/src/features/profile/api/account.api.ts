import { apiClient } from '@/src/shared/api/client';
import type {
  AccountProfile,
  AccountUpdateRequest,
  ProfileImageResponse,
} from '../types/account.types';

export async function getAccount(): Promise<AccountProfile> {
  const response = await apiClient.get<AccountProfile>('/account/me');
  return response.data;
}

export async function updateAccount(data: AccountUpdateRequest): Promise<AccountProfile> {
  const response = await apiClient.patch<AccountProfile>('/account/me', data);
  return response.data;
}

export async function uploadProfileImage(
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<ProfileImageResponse> {
  const body = new FormData();
  body.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob);
  const response = await apiClient.post<ProfileImageResponse>('/account/me/profile-image', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteProfileImage(): Promise<ProfileImageResponse> {
  const response = await apiClient.delete<ProfileImageResponse>('/account/me/profile-image');
  return response.data;
}
