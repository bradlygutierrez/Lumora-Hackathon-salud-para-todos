import { apiClient } from '@/src/shared/api/client';
import {
  getPatient,
  getPatientClinicalSummary,
  getPatientFamily,
  listBloodTypes,
  listPatients,
  listSexes,
  registerClinicalPatient,
} from '../api/patients.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('patients API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists patients using real search/filter/pagination query params', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { items: [], total: 0, limit: 10, offset: 0 } });
    await listPatients({ search: 'Ana', sexo_id: 2, tipo_sangre_id: 4, limit: 10, offset: 0 });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/pacientes', {
      params: { search: 'Ana', sexo_id: 2, tipo_sangre_id: 4, limit: 10, offset: 0 },
    });
  });

  it('uses the atomic staff registration endpoint and never sends account credentials', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 10 } });
    const payload = {
      persona: {
        nombres: 'Ana',
        apellidos: 'López',
        email: 'ana@example.com',
        fecha_nacimiento: '1990-01-01',
        telefono: '88881111',
        sexo_id: 1,
        direccion: {
          linea_1: 'Calle 1',
          ciudad: 'Managua',
          pais: 'Nicaragua',
          es_principal: true,
        },
      },
      tipo_sangre_id: 2,
      contacto_emergencia: {
        nombre: 'Carlos López',
        parentesco: 'Padre/Madre',
        telefono: '88882222',
      },
    };
    await registerClinicalPatient(payload);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/pacientes/registro-clinico', payload);
    expect(mockedApiClient.post).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ username: expect.anything(), password: expect.anything() }),
    );
  });

  it('loads detail, family, catalogs and clinical handoff from backend routes', async () => {
    mockedApiClient.get.mockResolvedValue({ data: [] });
    await getPatient(7);
    await getPatientFamily(7);
    await listSexes();
    await listBloodTypes();
    await getPatientClinicalSummary(7);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/pacientes/7');
    expect(mockedApiClient.get).toHaveBeenCalledWith('/pacientes/7/familiares');
    expect(mockedApiClient.get).toHaveBeenCalledWith('/sexos', { params: { limit: 100, offset: 0 } });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/tipos-sangre', { params: { limit: 100, offset: 0 } });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/pacientes/7/resumen-clinico');
  });
});
