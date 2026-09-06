jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

import { familiaresApi } from '@/features/familiares/api/familiares-api';

const { httpClient: mockHttpClient } = jest.requireMock('@/shared/api/http-client') as {
  httpClient: { get: jest.Mock; patch: jest.Mock; post: jest.Mock };
};

describe('FamiliaresApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.patch.mockReset();
    mockHttpClient.post.mockReset();
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

  it('busca un usuario por correo bajo el prefijo /reminders', async () => {
    mockHttpClient.get.mockResolvedValue({ id: 9, full_name: 'Otra Persona', email: 'otra@test.com' });

    await familiaresApi.buscarUsuarioPorEmail('otra@test.com');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/reminders/usuarios/buscar', {
      params: { email: 'otra@test.com' },
    });
  });

  it('crea una relación (alta) bajo el prefijo /reminders', async () => {
    mockHttpClient.post.mockResolvedValue({ id: 4 });

    await familiaresApi.crearRelacion(6, {
      paciente_id: 6,
      usuario_relacionado_id: 9,
      tipo_relacion_id: 1,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/reminders/pacientes/6/relaciones', {
      paciente_id: 6,
      usuario_relacionado_id: 9,
      tipo_relacion_id: 1,
    });
  });

  it('lista el catálogo de tipos de relación SIN el prefijo /reminders (catálogo propio)', async () => {
    mockHttpClient.get.mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });

    await familiaresApi.getTiposRelacion();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/tipos-relacion?limit=100');
  });
});
