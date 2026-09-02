import { apiClient } from '@/src/shared/api/client';
import {
  changeStaffPassword,
  confirmMfaSetup,
  createMfaChallenge,
  forgotPassword,
  listStaffSessions,
  loginStaff,
  logoutAllStaffSessions,
  logoutOtherStaffSessions,
  revokeStaffSession,
  recoverMfaChallenge,
  resendEmailVerification,
  refreshStaffSession,
  setupMfa,
  verifyEmail,
  verifyEmailCode,
  verifyMfaChallenge,
} from '../api/auth.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls FastAPI login with the backend request schema', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'bearer',
      },
    });

    await expect(
      loginStaff({ login: 'doctor@example.com', password: 'safe-password' }),
    ).resolves.toEqual({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
      login: 'doctor@example.com',
      password: 'safe-password',
    });
  });

  it('calls FastAPI refresh with refresh_token', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: {
        access_token: 'next-access',
        refresh_token: 'next-refresh',
        token_type: 'bearer',
      },
    });

    await refreshStaffSession('stored-refresh');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'stored-refresh',
    });
  });

  it('calls FastAPI session listing and logout-all endpoints', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: [] });
    mockedApiClient.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    await expect(listStaffSessions()).resolves.toEqual([]);
    await expect(logoutAllStaffSessions()).resolves.toEqual({ message: 'ok' });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/auth/sessions');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout-all');
  });


  it('revokes one session and logs out other sessions without closing the current session', async () => {
    expect(revokeStaffSession).toEqual(expect.any(Function));
    expect(logoutOtherStaffSessions).toEqual(expect.any(Function));

    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });
    mockedApiClient.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    await revokeStaffSession(42);
    await expect(logoutOtherStaffSessions()).resolves.toEqual({ message: 'ok' });

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/auth/sessions/42');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout-others');
  });

  it('calls recovery and verification endpoints with backend schemas', async () => {
    mockedApiClient.post.mockResolvedValue({ data: { message: 'ok' } });

    await forgotPassword({ email: 'doctor@example.com' });
    await verifyEmail({ token: 'a'.repeat(32) });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'doctor@example.com',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
      token: 'a'.repeat(32),
    });
  });

  it('calls MFA setup and confirmation with the B08 backend schemas', async () => {
    mockedApiClient.post
      .mockResolvedValueOnce({
        data: {
          method_id: 44,
          secret: 'TOTP-SECRET',
          provisioning_uri: 'otpauth://totp/Lumora:test',
        },
      })
      .mockResolvedValueOnce({
        data: {
          method_id: 44,
          recovery_codes: ['recovery-one', 'recovery-two'],
        },
      });

    await setupMfa({ metodo_id: 1 });
    await confirmMfaSetup({ method_id: 44, code: '123456' });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/mfa/setup', {
      metodo_id: 1,
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/auth/mfa/setup/confirm',
      {
        method_id: 44,
        code: '123456',
      },
    );
  });

  it('calls MFA challenge, verify and recovery endpoints', async () => {
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { challenge_token: 'challenge', expires_in: 300 } })
      .mockResolvedValue({
        data: {
          access_token: 'access',
          refresh_token: 'refresh',
          token_type: 'bearer',
        },
      });

    await createMfaChallenge({ username: 'doctor', password: 'safe-password' });
    await verifyMfaChallenge({ challenge_token: 'challenge-token', code: '123456' });
    await recoverMfaChallenge({
      challenge_token: 'challenge-token',
      recovery_code: 'recovery-code',
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/mfa/challenge', {
      username: 'doctor',
      password: 'safe-password',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/mfa/verify', {
      challenge_token: 'challenge-token',
      code: '123456',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/mfa/recovery', {
      challenge_token: 'challenge-token',
      recovery_code: 'recovery-code',
    });
  });

  it('changes the authenticated staff password with the backend schema', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { message: 'Contraseña actualizada' } });

    await expect(
      changeStaffPassword({
        current_password: 'StrongOld123!',
        new_password: 'Stronger123!',
      }),
    ).resolves.toEqual({ message: 'Contraseña actualizada' });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'StrongOld123!',
      new_password: 'Stronger123!',
    });
  });


  it('verifies and resends email using the six-digit backend contract', async () => {
    mockedApiClient.post.mockResolvedValue({ data: { message: 'ok' } });

    await verifyEmailCode({ email: 'doctor@example.com', code: '123456' });
    await resendEmailVerification({ email: 'doctor@example.com' });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
      email: 'doctor@example.com',
      code: '123456',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'doctor@example.com',
    });
  });

});
