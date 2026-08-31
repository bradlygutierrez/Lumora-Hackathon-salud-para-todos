import { apiClient } from '@/src/shared/api/client';
import { listMyPatients } from '../api/my-patients.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const client = jest.mocked(apiClient);

describe('my patients API J15', () => {
  it('uses the authenticated professional workspace endpoint', async () => {
    client.get.mockResolvedValueOnce({ data: [] });
    await listMyPatients();
    expect(client.get).toHaveBeenCalledWith('/profesional/me/pacientes');
  });
});
