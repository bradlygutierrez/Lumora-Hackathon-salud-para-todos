import { apiClient } from '@/src/shared/api/client';
import {
  createDiagnosis,
  deleteDiagnosis,
  getDiagnosis,
  listDiagnoses,
  listDiagnosisTypes,
  updateDiagnosis,
} from '../api/diagnoses.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('diagnoses API J13', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses J04 diagnosis routes and pagination', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { id: 44 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 44 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 44 } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listDiagnoses(18, { limit: 20, offset: 0 });
    await createDiagnosis(18, {
      tipo_diagnostico_id: 2,
      descripcion: 'Diagnóstico de prueba',
    });
    await getDiagnosis(44);
    await updateDiagnosis(44, { es_principal: true });
    await deleteDiagnosis(44);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/consultas/18/diagnosticos',
      { params: { limit: 20, offset: 0 } },
    );
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/consultas/18/diagnosticos',
      { tipo_diagnostico_id: 2, descripcion: 'Diagnóstico de prueba' },
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/diagnosticos/44');
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/diagnosticos/44', {
      es_principal: true,
    });
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/diagnosticos/44');
  });

  it('loads diagnosis types from FastAPI with active filtering', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 100, offset: 0 },
    });

    await listDiagnosisTypes({ limit: 100, offset: 0, activo: true });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/tipos-diagnostico', {
      params: { limit: 100, offset: 0, activo: true },
    });
  });
});
