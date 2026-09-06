jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { healthAlertsApi } from '@/features/health-alerts/api/health-alerts-api';

const { httpClient: mockHttpClient } = jest.requireMock(
  '@/shared/api/http-client',
) as { httpClient: { get: jest.Mock } };

describe('HealthAlertsApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
  });

  it("lists a patient's health alerts", async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await healthAlertsApi.getPatientAlerts(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/health-alerts/patients/7');
  });
});
