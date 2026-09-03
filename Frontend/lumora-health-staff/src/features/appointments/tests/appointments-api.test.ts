import { apiClient } from '@/src/shared/api/client';
import {
  createMySchedule,
  deleteMySchedule,
  getMyAvailability,
  listMyAgenda,
  listMySchedules,
  updateMySchedule,
} from '../api/appointments.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const client = jest.mocked(apiClient);

describe('professional workspace appointment API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses only self-scoped professional endpoints', async () => {
    client.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { fecha: '2026-08-31', slots: [] } });
    client.post.mockResolvedValueOnce({ data: { id: 1 } });
    client.patch.mockResolvedValueOnce({ data: { id: 1 } });
    client.delete.mockResolvedValueOnce({ data: undefined });

    await listMyAgenda();
    await listMySchedules();
    await getMyAvailability('2026-08-31');
    await createMySchedule({
      dia_semana: 0,
      hora_inicio: '08:00:00',
      hora_fin: '10:00:00',
    });
    await updateMySchedule(1, { activo: false });
    await deleteMySchedule(1);

    expect(client.get).toHaveBeenNthCalledWith(1, '/profesional/me/agenda');
    expect(client.get).toHaveBeenNthCalledWith(2, '/profesional/me/horarios');
    expect(client.get).toHaveBeenNthCalledWith(
      3,
      '/profesional/me/disponibilidad',
      { params: { fecha: '2026-08-31' } },
    );
    expect(client.post).toHaveBeenCalledWith(
      '/profesional/me/horarios',
      expect.objectContaining({ dia_semana: 0 }),
    );
    expect(client.patch).toHaveBeenCalledWith(
      '/profesional/me/horarios/1',
      { activo: false },
    );
    expect(client.delete).toHaveBeenCalledWith('/profesional/me/horarios/1');
  });
});
