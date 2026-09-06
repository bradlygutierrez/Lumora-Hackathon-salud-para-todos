jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { notificationsApi } from '@/features/notifications/api/notifications-api';

const { httpClient: mockHttpClient } = jest.requireMock('@/shared/api/http-client') as {
  httpClient: { get: jest.Mock; patch: jest.Mock };
};

describe('NotificationsApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.patch.mockReset();
  });

  it("lists a patient's notifications", async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await notificationsApi.getPatientNotifications(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/reminders/notificaciones/paciente/7');
  });

  it('marks a notification as read', async () => {
    mockHttpClient.patch.mockResolvedValue({ id: 1, leido: true });

    await notificationsApi.markAsRead(1);

    expect(mockHttpClient.patch).toHaveBeenCalledWith(
      '/reminders/notificaciones/1/marcar-leida',
    );
  });
});
