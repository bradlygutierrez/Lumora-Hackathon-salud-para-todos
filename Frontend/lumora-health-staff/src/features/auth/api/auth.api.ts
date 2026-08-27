import { apiClient } from '@/src/shared/api/client';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  MfaChallengeRequest,
  MfaChallengeResponse,
  MfaMethod,
  MfaRecoveryRequest,
  MfaSetupRequest,
  MfaSetupResponse,
  MfaVerifyRequest,
  ResetPasswordRequest,
  SessionRead,
  TokenPairResponse,
  VerifyEmailRequest,
} from '../types/auth.types';

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

export async function logoutAllStaffSessions(): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/logout-all');
  return response.data;
}

export async function listStaffSessions(): Promise<SessionRead[]> {
  const response = await apiClient.get<SessionRead[]>('/auth/sessions');
  return response.data;
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/forgot-password', data);
  return response.data;
}

export async function resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/reset-password', data);
  return response.data;
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/verify-email', data);
  return response.data;
}

export async function listMfaMethods(): Promise<MfaMethod[]> {
  const response = await apiClient.get<MfaMethod[]>('/auth/mfa/methods');
  return response.data;
}

export async function setupMfa(data: MfaSetupRequest): Promise<MfaSetupResponse> {
  const response = await apiClient.post<MfaSetupResponse>('/auth/mfa/setup', data);
  return response.data;
}

export async function createMfaChallenge(
  data: MfaChallengeRequest,
): Promise<MfaChallengeResponse> {
  const response = await apiClient.post<MfaChallengeResponse>('/auth/mfa/challenge', data);
  return response.data;
}

export async function verifyMfaChallenge(
  data: MfaVerifyRequest,
): Promise<TokenPairResponse> {
  const response = await apiClient.post<TokenPairResponse>('/auth/mfa/verify', data);
  return response.data;
}

export async function recoverMfaChallenge(
  data: MfaRecoveryRequest,
): Promise<TokenPairResponse> {
  const response = await apiClient.post<TokenPairResponse>('/auth/mfa/recovery', data);
  return response.data;
}

export async function disableMfaMethod(methodId: number): Promise<void> {
  await apiClient.delete(`/auth/mfa/${methodId}`);
}
