jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { healthIndicatorsApi } from '@/features/health-indicators/api/health-indicators-api';

const { httpClient: mockHttpClient } = jest.requireMock(
  '@/shared/api/http-client',
) as { httpClient: { get: jest.Mock; post: jest.Mock } };

describe('HealthIndicatorsApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.post.mockReset();
  });

  it('lists active indicators', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await healthIndicatorsApi.getIndicators();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/health-indicators/indicators', {
      params: { active_only: true },
    });
  });

  it('lists the active ranges of an indicator', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await healthIndicatorsApi.getIndicatorRanges('ind-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/health-indicators/indicators/ind-1/ranges',
      { params: { active_only: true } },
    );
  });

  it('lists a patient\'s measurements', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await healthIndicatorsApi.getPatientMeasurements(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/health-indicators/patients/7/measurements',
    );
  });

  it('registers a measurement without sending registrado_por_id (the backend forces it)', async () => {
    mockHttpClient.post.mockResolvedValue({ id: 'medicion-1' });

    await healthIndicatorsApi.registerMeasurement(7, {
      indicador_id: 'ind-1',
      valor: 120,
      unidad_medida_id: 1,
      origen_registro_id: 1,
      observaciones: null,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/health-indicators/patients/7/measurements',
      {
        indicador_id: 'ind-1',
        valor: 120,
        unidad_medida_id: 1,
        origen_registro_id: 1,
        observaciones: null,
      },
    );

    const [, body] = mockHttpClient.post.mock.calls[0];
    expect(body).not.toHaveProperty('registrado_por_id');
  });

  it('lists a patient\'s alerts, including attended ones when solo_pendientes=false', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await healthIndicatorsApi.getPatientAlerts(7, false);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/health-indicators/patients/7/alerts', {
      params: { solo_pendientes: false },
    });
  });
});
