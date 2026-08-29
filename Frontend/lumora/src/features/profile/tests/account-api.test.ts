jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { accountApi } from '@/features/profile/api/account-api';
import { httpClient } from '@/shared/api/http-client';

const mockedClient = jest.mocked(httpClient);

describe('AccountApiService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the self-account endpoint', async () => {
    mockedClient.get.mockResolvedValue({ id: 1 });
    await accountApi.getMe();
    expect(mockedClient.get).toHaveBeenCalledWith('/account/me');
  });

  it('uses patient-scoped emergency contacts', async () => {
    mockedClient.get.mockResolvedValue({ items: [] });
    await accountApi.getEmergencyContacts(7);
    expect(mockedClient.get).toHaveBeenCalledWith(
      '/pacientes/7/contactos-emergencia',
      { params: { limit: 100, offset: 0 } },
    );
  });
});
