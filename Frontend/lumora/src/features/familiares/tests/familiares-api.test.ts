jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { familiaresApi } from '@/features/familiares/api/familiares-api';

const { httpClient: mockHttpClient } = jest.requireMock('@/shared/api/http-client') as {
  httpClient: { get: jest.Mock; patch: jest.Mock };
};

describe('FamiliaresApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.patch.mockReset();
  });

  it("lista las relaciones de un paciente bajo el prefijo /reminders", async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await familiaresApi.getRelaciones(6);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/reminders/pacientes/6/relaciones');
  });

  it('actualiza permisos (recibir_notificaciones / nivel_acceso) bajo el prefijo /reminders', async () => {
    mockHttpClient.patch.mockResolvedValue({ id: 3 });

    await familiaresApi.updateRelacion(6, 3, { nivel_acceso: 'write' });

    expect(mockHttpClient.patch).toHaveBeenCalledWith('/reminders/pacientes/6/relaciones/3', {
      nivel_acceso: 'write',
    });
  });

  it('revoca una relación enviando estado="revoked" bajo el prefijo /reminders', async () => {
    mockHttpClient.patch.mockResolvedValue({ id: 3, estado: 'revoked' });

    await familiaresApi.updateRelacion(6, 3, { estado: 'revoked' });

    expect(mockHttpClient.patch).toHaveBeenCalledWith('/reminders/pacientes/6/relaciones/3', {
      estado: 'revoked',
    });
  });
});
