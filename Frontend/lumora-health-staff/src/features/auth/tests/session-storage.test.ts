import * as SecureStore from 'expo-secure-store';

import { SecureSessionManager } from '../services/session-storage';

const mockedSecureStore = jest.mocked(SecureStore);

describe('SecureSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores token pairs using the FastAPI token contract', async () => {
    const manager = new SecureSessionManager();

    const session = await manager.saveTokenPair({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
    });

    expect(session).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'bearer',
    });
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'lumora.healthStaff.session',
      JSON.stringify(session),
    );
  });

  it('clears invalid stored sessions', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce('{broken');
    const manager = new SecureSessionManager();

    await expect(manager.getSession()).resolves.toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'lumora.healthStaff.session',
    );
  });
});
