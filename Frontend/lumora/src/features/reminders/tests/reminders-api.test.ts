jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { remindersApi } from '@/features/reminders/api/reminders-api';

const { httpClient: mockHttpClient } = jest.requireMock('@/shared/api/http-client') as {
  httpClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
};

describe('RemindersApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.post.mockReset();
    mockHttpClient.patch.mockReset();
  });

  it("lists a patient's reminders under the /reminders prefix", async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await remindersApi.getPatientReminders(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/reminders/recordatorios/paciente/7');
  });

  it('creates a reminder under the /reminders prefix', async () => {
    mockHttpClient.post.mockResolvedValue({ id: 1 });

    const data = {
      paciente_id: 7,
      tipo_recordatorio_id: 4,
      titulo: 'Beber Agua',
      mensaje: 'Objetivo: 2 Litros diarios',
      fecha_programada: '2026-08-29T12:00:00.000Z',
      objetivo_cantidad: 2,
      progreso_actual: 0,
      unidad: 'Litros',
    };

    await remindersApi.createReminder(data);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/reminders/recordatorios', data);
  });

  it('updates a reminder under the /reminders prefix', async () => {
    mockHttpClient.patch.mockResolvedValue({ id: 1, progreso_actual: 1 });

    await remindersApi.updateReminder(1, { progreso_actual: 1 });

    expect(mockHttpClient.patch).toHaveBeenCalledWith('/reminders/recordatorios/1', {
      progreso_actual: 1,
    });
  });

  it('lists reminder types WITHOUT the /reminders prefix (own catalog router)', async () => {
    mockHttpClient.get.mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });

    await remindersApi.getReminderTypes();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/tipos-recordatorio?limit=100');
  });
});
