import { apiClient } from '@/src/shared/api/client';
import { getProfessional, listProfessionals } from '../api/professionals.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('professionals API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists professionals with backend pagination params', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 50, offset: 0 },
    });

    await listProfessionals({ limit: 50, offset: 0 });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/profesionales', {
      params: { limit: 50, offset: 0 },
    });
  });

  it('loads a staff profile by professional id', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { id: 7 } });

    await getProfessional(7);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/profesionales/7');
  });
});
