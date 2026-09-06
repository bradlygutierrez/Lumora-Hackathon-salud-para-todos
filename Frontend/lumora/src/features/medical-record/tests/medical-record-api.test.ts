jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { medicalRecordApi } from '@/features/medical-record/api/medical-record-api';

const { httpClient: mockHttpClient } = jest.requireMock(
  '@/shared/api/http-client',
) as { httpClient: { get: jest.Mock } };

describe('MedicalRecordApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
  });

  it('fetches the exportable medical record document for a patient', async () => {
    mockHttpClient.get.mockResolvedValue({ paciente_id: 7 });

    await medicalRecordApi.getDocument(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/patients/7/medical-record');
  });
});
