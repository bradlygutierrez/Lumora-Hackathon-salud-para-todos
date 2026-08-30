import { apiClient } from '@/src/shared/api/client';
import {
  createPrescription,
  createPrescriptionDetail,
  deletePrescriptionDetail,
  getPrescription,
  listAdministrationRoutes,
  listMeasurementUnits,
  listMedications,
  listPatientPrescriptions,
  listPrescriptionStatuses,
  updatePrescription,
  updatePrescriptionDetail,
} from '../api/prescriptions.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('prescriptions API J13', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses patient prescription and detail routes from FastAPI', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { id: 'rx-1' } });
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { id: 'rx-1' } })
      .mockResolvedValueOnce({ data: { id: 'detail-2' } });
    mockedApiClient.patch
      .mockResolvedValueOnce({ data: { id: 'rx-1' } })
      .mockResolvedValueOnce({ data: { id: 'detail-1' } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listPatientPrescriptions(101);
    await getPrescription('rx-1');
    await createPrescription({
      paciente_id: 101,
      profesional_id: 9,
      estado_id: 2,
      detalles: [],
    });
    await updatePrescription('rx-1', { estado_id: 3 });
    await createPrescriptionDetail('rx-1', {
      medicamento_id: 'med-1',
      unidad_medida_id: 1,
      via_administracion_id: 1,
      dosis: '50 mg',
      frecuencia: 'Cada 12 horas',
      duracion_dias: 10,
      cantidad_total: 20,
    });
    await updatePrescriptionDetail('rx-1', 'detail-1', { dosis: '25 mg' });
    await deletePrescriptionDetail('rx-1', 'detail-1');

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/prescriptions/patient/101',
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/prescriptions/rx-1',
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      '/prescriptions',
      expect.objectContaining({ paciente_id: 101, profesional_id: 9 }),
    );
    expect(mockedApiClient.patch).toHaveBeenNthCalledWith(
      1,
      '/prescriptions/rx-1',
      { estado_id: 3 },
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      '/prescriptions/rx-1/detalles',
      expect.objectContaining({ medicamento_id: 'med-1' }),
    );
    expect(mockedApiClient.patch).toHaveBeenNthCalledWith(
      2,
      '/prescriptions/rx-1/detalles/detail-1',
      { dosis: '25 mg' },
    );
    expect(mockedApiClient.delete).toHaveBeenCalledWith(
      '/prescriptions/rx-1/detalles/detail-1',
    );
  });

  it('uses medication and real prescription catalogs', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValue({ data: { items: [], total: 0, limit: 100, offset: 0 } });

    await listMedications({ limit: 100, offset: 0 });
    await listPrescriptionStatuses();
    await listAdministrationRoutes();
    await listMeasurementUnits();

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      1,
      '/prescriptions/medications',
      { params: { limit: 100, offset: 0 } },
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      2,
      '/estados-receta',
      { params: { limit: 100, offset: 0 } },
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      3,
      '/vias-administracion',
      { params: { limit: 100, offset: 0 } },
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      4,
      '/unidades-medida',
      { params: { limit: 100, offset: 0 } },
    );
  });
});
