import { act, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import {
  AuthSessionProvider,
  useAuthSession,
} from '../hooks/use-auth-session';
import { loginStaff } from '../api/auth.api';
import { getCurrentStaffUser } from '../api/users.api';
import { secureSessionManager } from '../services/session-storage';

jest.mock('../api/auth.api', () => ({
  loginStaff: jest.fn(),
  logoutStaff: jest.fn(),
  logoutAllStaffSessions: jest.fn(),
  refreshStaffSession: jest.fn(),
}));

jest.mock('../api/users.api', () => ({
  getCurrentStaffUser: jest.fn(),
}));

jest.mock('../services/session-storage', () => ({
  secureSessionManager: {
    clearSession: jest.fn(),
    getSession: jest.fn(),
    saveSession: jest.fn(),
    saveTokenPair: jest.fn(),
  },
}));

type AuthValue = ReturnType<typeof useAuthSession>;

function SessionProbe({ onValue }: { onValue: (value: AuthValue) => void }) {
  const value = useAuthSession();

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

const mockedLoginStaff = jest.mocked(loginStaff);
const mockedGetCurrentStaffUser = jest.mocked(getCurrentStaffUser);
const mockedSessionManager = jest.mocked(secureSessionManager);

describe('AuthSessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSessionManager.getSession.mockResolvedValue(null);
    mockedSessionManager.saveSession.mockResolvedValue();
    mockedSessionManager.clearSession.mockResolvedValue();
    mockedSessionManager.saveTokenPair.mockResolvedValue({
      accessToken: 'unexpected-access',
      refreshToken: 'unexpected-refresh',
      tokenType: 'bearer',
    });
  });

  it('keeps the backend MFA challenge pending instead of persisting a token session', async () => {
    mockedLoginStaff.mockResolvedValue({
      mfa_required: true,
      challenge_token: 'challenge-from-login',
      expires_in: 300,
      method: 'totp',
    });

    let authValue: AuthValue | undefined;

    await render(
      <AuthSessionProvider>
        <SessionProbe onValue={(value) => { authValue = value; }} />
      </AuthSessionProvider>,
    );

    await waitFor(() => expect(authValue?.status).toBe('anonymous'));

    let outcome: unknown;
    await act(async () => {
      outcome = await authValue?.signIn({
        login: 'doctor@example.com',
        password: 'safe-password',
      });
    });

    expect(outcome).toBe('mfa_required');
    expect(authValue).toHaveProperty('pendingMfa', {
      challengeToken: 'challenge-from-login',
      expiresIn: 300,
      method: 'totp',
    });
    expect(mockedSessionManager.saveTokenPair).not.toHaveBeenCalled();
    expect(authValue?.status).toBe('anonymous');
  });

  it('enriches a token session from auth/me without decoding the JWT subject', async () => {
    mockedGetCurrentStaffUser.mockResolvedValue({
      id: 7,
      email: 'doctor@example.com',
      username: 'doctor',
      activo: true,
      email_verificado: true,
      persona: { id: 9, nombres: 'Ana', apellidos: 'Mora' },
      roles: [
        {
          id: 3,
          nombre: 'Profesional',
          permisos: [{ id: 5, nombre: 'clinica:manage' }],
        },
      ],
    });
    mockedSessionManager.saveTokenPair.mockResolvedValue({
      accessToken: 'opaque-access-token',
      refreshToken: 'refresh-token',
      tokenType: 'bearer',
    });

    let authValue: AuthValue | undefined;
    await render(
      <AuthSessionProvider>
        <SessionProbe onValue={(value) => { authValue = value; }} />
      </AuthSessionProvider>,
    );
    await waitFor(() => expect(authValue?.status).toBe('anonymous'));

    await act(async () => {
      await authValue?.completeTokenSignIn({
        access_token: 'opaque-access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
      });
    });

    expect(mockedGetCurrentStaffUser).toHaveBeenCalledTimes(1);
    expect(authValue?.session?.user?.username).toBe('doctor');
    expect(authValue?.permissions.has('clinica:manage')).toBe(true);
  });

});
