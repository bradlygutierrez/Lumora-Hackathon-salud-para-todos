import { apiClient } from '@/src/shared/api/client';
import {
  createMySchedule,
  deleteMyLocation,
  deleteMySchedule,
  getAppointment,
  getMyAvailability,
  getMyLocation,
  listMyAgenda,
  listMySchedules,
  listPatientAppointments,
  setMyLocation,
  updateMySchedule,
} from '../api/appointments.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
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

    await listMyAgenda({ desde: '2026-08-31T00:00:00.000Z', hasta: '2026-09-07T00:00:00.000Z' });
    await listMySchedules();
    await getMyAvailability('2026-08-31');
    await createMySchedule({
      dia_semana: 0,
      hora_inicio: '08:00:00',
      hora_fin: '10:00:00',
    });
    await updateMySchedule(1, { activo: false });
    await deleteMySchedule(1);

    expect(client.get).toHaveBeenNthCalledWith(1, '/profesional/me/agenda', {
      params: { desde: '2026-08-31T00:00:00.000Z', hasta: '2026-09-07T00:00:00.000Z' },
    });
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

  it('fetches a single appointment and a patient-scoped list from /citas', async () => {
    client.get
      .mockResolvedValueOnce({ data: { id: 4 } })
      .mockResolvedValueOnce({ data: [{ id: 4 }] });

    await getAppointment(4);
    await listPatientAppointments(9);

    expect(client.get).toHaveBeenNthCalledWith(1, '/citas/4');
    expect(client.get).toHaveBeenNthCalledWith(2, '/citas', {
      params: { paciente_id: 9 },
    });
  });

  it('manages the professional own consultation address via self-scoped endpoints', async () => {
    client.get.mockResolvedValueOnce({ data: null });
    client.put.mockResolvedValueOnce({ data: { id: 3 } });
    client.delete.mockResolvedValueOnce({ data: undefined });

    await getMyLocation();
    await setMyLocation({ nombre: 'Consultorio', direccion: 'Managua' });
    await deleteMyLocation();

    expect(client.get).toHaveBeenCalledWith('/profesional/me/ubicacion');
    expect(client.put).toHaveBeenCalledWith('/profesional/me/ubicacion', {
      nombre: 'Consultorio',
      direccion: 'Managua',
    });
    expect(client.delete).toHaveBeenCalledWith('/profesional/me/ubicacion');
  });
});
