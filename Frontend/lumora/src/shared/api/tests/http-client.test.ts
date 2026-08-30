import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/shared/api/api-error';
import { HttpClientManager } from '@/shared/api/http-client';

const mockedSecureStore = jest.mocked(SecureStore);

describe('HttpClientManager', () => {
  const axiosInstance = axios.create();
  const mock = new MockAdapter(axiosInstance);
  const client = new HttpClientManager(axiosInstance);

  beforeEach(() => {
    mock.reset();
    jest.clearAllMocks();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
  });

  afterAll(() => {
    mock.restore();
  });

  it('returns response.data from GET requests', async () => {
    mock.onGet('/health').reply(200, { ok: true });

    await expect(client.get<{ ok: boolean }>('/health')).resolves.toEqual({
      ok: true,
    });
  });

  it('adds the stored access token as Bearer authorization', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    mock.onGet('/protected').reply((config) => [
      200,
      { authorization: config.headers?.Authorization },
    ]);

    await expect(
      client.get<{ authorization?: string }>('/protected'),
    ).resolves.toEqual({
      authorization: 'Bearer access-token',
    });
  });

  it('normalizes a 500 response as SERVER_ERROR', async () => {
    mock.onGet('/broken').reply(500, {
      error: {
        code: 'internal_error',
        message: 'Internal error',
      },
    });

    try {
      await client.get('/broken');
      throw new Error('Expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  });

  it('refreshes once and repeats the original request', async () => {
    const instance = axios.create();
    const localMock = new MockAdapter(instance);
    const localClient = new HttpClientManager(instance);
    let storedSession = { accessToken: 'expired', refreshToken: 'refresh' };
    mockedSecureStore.getItemAsync.mockImplementation(async () => JSON.stringify(storedSession));
    mockedSecureStore.setItemAsync.mockImplementation(async (_key, value) => {
      storedSession = JSON.parse(value) as typeof storedSession;
    });
    const refresh = jest.fn().mockResolvedValue({ accessToken: 'renewed', refreshToken: 'next' });
    localClient.setRefreshHandler(refresh);
    localMock.onGet('/protected').reply((config) =>
      config.headers?.Authorization === 'Bearer renewed'
        ? [200, { ok: true }]
        : [401, {}],
    );

    await expect(localClient.get('/protected')).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    localMock.restore();
  });

  it('shares one refresh across concurrent requests', async () => {
    const instance = axios.create();
    const localMock = new MockAdapter(instance);
    const localClient = new HttpClientManager(instance);
    let storedSession = { accessToken: 'expired', refreshToken: 'refresh' };
    mockedSecureStore.getItemAsync.mockImplementation(async () => JSON.stringify(storedSession));
    mockedSecureStore.setItemAsync.mockImplementation(async (_key, value) => {
      storedSession = JSON.parse(value) as typeof storedSession;
    });
    const refresh = jest.fn().mockResolvedValue({ accessToken: 'renewed', refreshToken: 'next' });
    localClient.setRefreshHandler(refresh);
    localMock.onGet().reply((config) =>
      config.headers?.Authorization === 'Bearer renewed' ? [200, { ok: true }] : [401, {}],
    );

    await expect(Promise.all([localClient.get('/one'), localClient.get('/two')])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
    localMock.restore();
  });

  it('clears the session when refresh fails', async () => {
    const instance = axios.create();
    const localMock = new MockAdapter(instance);
    const localClient = new HttpClientManager(instance);
    const expired = jest.fn();
    mockedSecureStore.getItemAsync.mockResolvedValue(
      JSON.stringify({ accessToken: 'expired', refreshToken: 'refresh' }),
    );
    mockedSecureStore.deleteItemAsync.mockResolvedValue();
    localClient.setRefreshHandler(jest.fn().mockRejectedValue(new Error('refresh failed')));
    localClient.setSessionExpiredHandler(expired);
    localMock.onGet('/protected').reply(401);

    await expect(localClient.get('/protected')).rejects.toBeInstanceOf(ApiError);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
    localMock.restore();
  });
});
