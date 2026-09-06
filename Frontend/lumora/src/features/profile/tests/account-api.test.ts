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

  it('falls back to the authenticated identity when the rich profile fails', async () => {
    mockedClient.get
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockResolvedValueOnce({
        id: 5,
        username: 'caregiver',
        email: 'caregiver@example.com',
        email_verificado: true,
        activo: true,
        persona: { id: 8, nombres: 'Carlos', apellidos: 'Cuidador' },
        roles: [{ id: 2, nombre: 'Cuidador' }],
      });

    const profile = await accountApi.getMe();

    expect(mockedClient.get).toHaveBeenNthCalledWith(1, '/account/me');
    expect(mockedClient.get).toHaveBeenNthCalledWith(2, '/auth/me');
    expect(profile.person.first_names).toBe('Carlos');
    expect(profile.roles).toEqual([{ id: 2, name: 'Cuidador' }]);
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
