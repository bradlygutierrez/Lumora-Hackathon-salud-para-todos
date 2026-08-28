import { apiClient } from '@/src/shared/api/client';
import { getMedicalRecordSummary, getMedicalRecordTimeline } from '../api/medical-records.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

describe('medical records api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the aggregated clinical summary for a patient', async () => {
    mockGet.mockResolvedValueOnce({ data: { paciente_id: 9, expediente: null } });

    await getMedicalRecordSummary(9);

    expect(mockGet).toHaveBeenCalledWith('/pacientes/9/resumen-clinico');
  });

  it('loads a filtered paginated medical timeline', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 10, offset: 20 } });

    await getMedicalRecordTimeline(17, { limit: 10, offset: 20, tipo: 'diagnostico' });

    expect(mockGet).toHaveBeenCalledWith('/expedientes/17/timeline', {
      params: { limit: 10, offset: 20, tipo: 'diagnostico' },
    });
  });
});
