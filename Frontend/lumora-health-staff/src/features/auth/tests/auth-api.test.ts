import { apiClient } from '@/src/shared/api/client';
import { loginStaff, refreshStaffSession } from '../api/auth.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    post: jest.fn(),
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
});
