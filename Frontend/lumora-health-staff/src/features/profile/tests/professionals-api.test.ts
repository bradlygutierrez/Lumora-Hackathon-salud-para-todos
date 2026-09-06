import { apiClient } from '@/src/shared/api/client';
import {
  findProfessionalByPersonId,
  getProfessional,
  listProfessionals,
} from '../api/professionals.api';

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

  it('resolves the authenticated professional across paginated results', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 1, persona: { id: 10 } }],
          total: 2,
          limit: 100,
          offset: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 2, persona: { id: 99 } }],
          total: 2,
          limit: 100,
          offset: 1,
        },
      });

    await expect(findProfessionalByPersonId(99)).resolves.toMatchObject({ id: 2 });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/profesionales', {
      params: { limit: 100, offset: 0 },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/profesionales', {
      params: { limit: 100, offset: 1 },
    });
  });

  it('returns null when the session person has no professional profile', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        items: [{ id: 1, persona: { id: 10 } }],
        total: 1,
        limit: 100,
        offset: 0,
      },
    });

    await expect(findProfessionalByPersonId(99)).resolves.toBeNull();
  });

  it('loads a staff profile by professional id', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { id: 7 } });

    await getProfessional(7);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/profesionales/7');
  });
});
