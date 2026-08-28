import { apiClient } from '@/src/shared/api/client';
import { getCurrentStaffUser } from '../api/users.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('staff user API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the authenticated staff context from auth/me', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
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
      },
    });

    await getCurrentStaffUser('opaque-access-token');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/auth/me', {
      headers: { Authorization: 'bearer opaque-access-token' },
    });
  });
});
