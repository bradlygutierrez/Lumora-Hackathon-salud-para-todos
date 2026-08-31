import { apiClient } from '@/src/shared/api/client';
import {
  listHealthIndicators,
  listMeasurementOrigins,
  listMeasurementUnits,
  listPatientMeasurements,
} from '../api/measurements.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const client = jest.mocked(apiClient);

describe('measurements API J15', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reuses the existing health-indicator measurement source and catalogs', async () => {
    client.get.mockResolvedValue({ data: [] });

    await listPatientMeasurements(9);
    await listHealthIndicators();
    await listMeasurementUnits();
    await listMeasurementOrigins();

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/health-indicators/patients/9/measurements',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/health-indicators/indicators',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      3,
      '/unidades-medida',
      { params: { limit: 100, offset: 0 } },
    );
    expect(client.get).toHaveBeenNthCalledWith(
      4,
      '/origenes-registro',
      { params: { limit: 100, offset: 0 } },
    );
  });
});
