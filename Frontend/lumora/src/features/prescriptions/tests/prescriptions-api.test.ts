jest.mock('@/shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { prescriptionsApi } from '@/features/prescriptions/api/prescriptions-api';

const { httpClient: mockHttpClient } = jest.requireMock(
  '@/shared/api/http-client',
) as { httpClient: { get: jest.Mock } };

describe('PrescriptionsApiService', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
  });

  it('resolves the authenticated patient profile from /pacientes/me', async () => {
    mockHttpClient.get.mockResolvedValue({ id: 7 });

    await prescriptionsApi.getMyPatientProfile();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/pacientes/me');
  });

  it('lists a patient\'s prescriptions by paciente_id', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await prescriptionsApi.getPrescriptionsByPatient(7);

    expect(mockHttpClient.get).toHaveBeenCalledWith('/prescriptions/patient/7');
  });

  it('fetches a single prescription by id', async () => {
    mockHttpClient.get.mockResolvedValue({ id: 'receta-1' });

    await prescriptionsApi.getPrescription('receta-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/prescriptions/receta-1');
  });

  it('fetches the medications catalog with a high page size', async () => {
    mockHttpClient.get.mockResolvedValue([]);

    await prescriptionsApi.getMedications();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/prescriptions/medications?limit=100');
  });

  it.each([
    ['getPrescriptionStatuses', '/estados-receta?limit=100'],
    ['getDoseStatuses', '/estados-dosis?limit=100'],
    ['getRecordOrigins', '/origenes-registro?limit=100'],
    ['getMeasurementUnits', '/unidades-medida?limit=100'],
    ['getAdministrationRoutes', '/vias-administracion?limit=100'],
  ] as const)('%s calls %s', async (method, expectedUrl) => {
    mockHttpClient.get.mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });

    await prescriptionsApi[method]();

    expect(mockHttpClient.get).toHaveBeenCalledWith(expectedUrl);
  });
});
