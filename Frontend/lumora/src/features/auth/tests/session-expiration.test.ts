import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '@/features/auth/store/auth-store';

const mockedSecureStore = jest.mocked(SecureStore);

describe('session expiration state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.deleteItemAsync.mockResolvedValue();
    mockedSecureStore.setItemAsync.mockResolvedValue();
    useAuthStore.setState({
      status: 'authenticated',
      session: { accessToken: 'fake-access', refreshToken: 'fake-refresh' },
      pendingMfa: null,
      notice: null,
    });
  });

  it('clears session and exposes an expiration notice', async () => {
    await useAuthStore.getState().clearSession('session-expired');
    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      session: null,
      notice: 'session-expired',
    });
  });

  it('clears the expiration notice after a new session', async () => {
    useAuthStore.setState({ notice: 'session-expired' });
    await useAuthStore.getState().setSession({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(useAuthStore.getState().notice).toBeNull();
  });
});
