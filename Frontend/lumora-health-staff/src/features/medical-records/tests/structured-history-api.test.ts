import { apiClient } from '@/src/shared/api/client';
import {
  createAllergy,
  createCondition,
  createDisability,
  createMedicalHistoryEntry,
  deleteAllergy,
  deleteCondition,
  deleteDisability,
  deleteMedicalHistoryEntry,
  findCondition,
  getAllergy,
  getDisability,
  getMedicalHistoryEntry,
  listAllergies,
  listConditionHistory,
  listConditions,
  listConditionStatuses,
  listDisabilities,
  listMedicalHistory,
  listMedicalHistoryTypes,
  listSeverityLevels,
  updateAllergy,
  updateCondition,
  updateDisability,
  updateMedicalHistoryEntry,
} from '../api/structured-history.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('structured history API J12', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses J04 condition routes, history and soft delete', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 10, offset: 0 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 31 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 31 } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listConditions(7, { limit: 20, offset: 0, activo: true });
    await createCondition(7, { estado_condicion_id: 1, nombre: 'Hipertensión' });
    await updateCondition(31, { estado_condicion_id: 3, motivo_historial: 'Seguimiento' });
    await listConditionHistory(31, { limit: 10, offset: 0 });
    await deleteCondition(31);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/expedientes/7/condiciones', {
      params: { limit: 20, offset: 0, activo: true },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/expedientes/7/condiciones', {
      estado_condicion_id: 1,
      nombre: 'Hipertensión',
    });
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/condiciones/31', {
      estado_condicion_id: 3,
      motivo_historial: 'Seguimiento',
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/condiciones/31/historial', {
      params: { limit: 10, offset: 0 },
    });
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/condiciones/31');
  });

  it('resolves condition edit data by paging the list because J04 has no detail GET', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
          total: 101,
          limit: 100,
          offset: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 101, nombre: 'Condición 101' }],
          total: 101,
          limit: 100,
          offset: 100,
        },
      });

    const condition = await findCondition(9, 101);

    expect(condition).toEqual(expect.objectContaining({ id: 101 }));
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/expedientes/9/condiciones', {
      params: { limit: 100, offset: 0 },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/expedientes/9/condiciones', {
      params: { limit: 100, offset: 100 },
    });
  });

  it('uses patient-scoped allergy CRUD routes', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { id: 41 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 41 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 41 } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listAllergies(3, { limit: 20, offset: 0, activo: true });
    await getAllergy(3, 41);
    await createAllergy(3, { nombre: 'Penicilina', nivel_severidad_id: 3 });
    await updateAllergy(3, 41, { observaciones: null });
    await deleteAllergy(3, 41);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/pacientes/3/alergias', {
      params: { limit: 20, offset: 0, activo: true },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/pacientes/3/alergias/41');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/pacientes/3/alergias', {
      nombre: 'Penicilina',
      nivel_severidad_id: 3,
    });
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/pacientes/3/alergias/41', {
      observaciones: null,
    });
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/pacientes/3/alergias/41');
  });

  it('uses patient-scoped disability CRUD routes', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { id: 51 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 51 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 51 } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listDisabilities(4, { limit: 20, offset: 0 });
    await getDisability(4, 51);
    await createDisability(4, { nombre: 'Movilidad reducida' });
    await updateDisability(4, 51, { estado_condicion_id: 1 });
    await deleteDisability(4, 51);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/pacientes/4/discapacidades', {
      params: { limit: 20, offset: 0 },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/pacientes/4/discapacidades/51');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/pacientes/4/discapacidades', {
      nombre: 'Movilidad reducida',
    });
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/pacientes/4/discapacidades/51', {
      estado_condicion_id: 1,
    });
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/pacientes/4/discapacidades/51');
  });

  it('uses record-scoped medical history CRUD routes', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { id: 61 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 61 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 61 } });
    mockedApiClient.delete.mockResolvedValueOnce({ data: undefined });

    await listMedicalHistory(8, { limit: 20, offset: 0, activo: true });
    await getMedicalHistoryEntry(8, 61);
    await createMedicalHistoryEntry(8, {
      tipo_antecedente_id: 2,
      descripcion: 'Antecedente familiar',
    });
    await updateMedicalHistoryEntry(8, 61, { fecha: null });
    await deleteMedicalHistoryEntry(8, 61);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/expedientes/8/antecedentes', {
      params: { limit: 20, offset: 0, activo: true },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/expedientes/8/antecedentes/61');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/expedientes/8/antecedentes', {
      tipo_antecedente_id: 2,
      descripcion: 'Antecedente familiar',
    });
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/expedientes/8/antecedentes/61', {
      fecha: null,
    });
    expect(mockedApiClient.delete).toHaveBeenCalledWith('/expedientes/8/antecedentes/61');
  });

  it('loads J12 catalogs from FastAPI rather than hardcoding server ids', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 100, offset: 0 } })
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 100, offset: 0 } })
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 100, offset: 0 } });

    await listConditionStatuses({ limit: 100, offset: 0, activo: true });
    await listMedicalHistoryTypes({ limit: 100, offset: 0, activo: true });
    await listSeverityLevels({ limit: 100, offset: 0 });

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/estados-condicion', {
      params: { limit: 100, offset: 0, activo: true },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/tipos-antecedente', {
      params: { limit: 100, offset: 0, activo: true },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(3, '/niveles-severidad', {
      params: { limit: 100, offset: 0 },
    });
  });
});
