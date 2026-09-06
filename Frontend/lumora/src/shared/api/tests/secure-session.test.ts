import * as SecureStore from 'expo-secure-store';

import { secureSession } from '@/shared/api/secure-session';

const mockedSecureStore = jest.mocked(SecureStore);

describe('SecureSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there is no stored session', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);

    await expect(secureSession.get()).resolves.toBeNull();
  });

  it('restores a valid stored session', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    await expect(secureSession.get()).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('deletes corrupted session data', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue('{broken-json');

    await expect(secureSession.get()).resolves.toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'lumora.auth.session',
    );
  });
});
