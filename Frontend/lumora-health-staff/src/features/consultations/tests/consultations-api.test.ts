import { apiClient } from '@/src/shared/api/client';
import {
  createClinicalNote,
  createConsultation,
  createVitalSigns,
  getClinicalNote,
  getConsultation,
  listClinicalNotes,
  listConsultationReasons,
  listConsultations,
  listRecordConsultations,
  listVitalSigns,
  updateClinicalNote,
  updateConsultation,
} from '../api/consultations.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('consultations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists consultations with J03 filters and pagination', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 10, offset: 20 },
    });

    const params = {
      limit: 10,
      offset: 20,
      expediente_id: 8,
      paciente_id: 4,
      profesional_id: 2,
      activo: true,
      fecha_desde: '2026-08-01T00:00:00.000Z',
      fecha_hasta: '2026-08-31T23:59:59.000Z',
    };
    await listConsultations(params);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/consultas', { params });
  });

  it('lists consultations scoped to a medical record', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 20, offset: 0 },
    });

    await listRecordConsultations(17, { limit: 20, offset: 0, activo: true });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/expedientes/17/consultas', {
      params: { limit: 20, offset: 0, activo: true },
    });
  });

  it('gets, creates and updates consultations using the backend contract', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { id: 31 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 32 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 32 } });

    await getConsultation(31);
    await createConsultation({
      expediente_id: 7,
      paciente_id: 9,
      profesional_id: 3,
      motivo_consulta_id: 2,
      motivo: 'Control general',
      sintomas: 'Sin síntomas agudos',
    });
    await updateConsultation(32, { evaluacion: 'Paciente estable' });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/consultas/31');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/consultas', {
      expediente_id: 7,
      paciente_id: 9,
      profesional_id: 3,
      motivo_consulta_id: 2,
      motivo: 'Control general',
      sintomas: 'Sin síntomas agudos',
    });
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/consultas/32', {
      evaluacion: 'Paciente estable',
    });
  });

  it('lists and creates vital signs', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 5, offset: 0 },
    });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 41 } });

    await listVitalSigns(12, { limit: 5, offset: 0 });
    await createVitalSigns(12, {
      temperatura_c: 36.7,
      frecuencia_cardiaca: 72,
      presion_sistolica: 120,
      presion_diastolica: 80,
      saturacion_oxigeno: 98,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/consultas/12/signos-vitales', {
      params: { limit: 5, offset: 0 },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/consultas/12/signos-vitales', {
      temperatura_c: 36.7,
      frecuencia_cardiaca: 72,
      presion_sistolica: 120,
      presion_diastolica: 80,
      saturacion_oxigeno: 98,
    });
  });

  it('lists, gets, creates and updates clinical notes', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { items: [], total: 0, limit: 20, offset: 0 } })
      .mockResolvedValueOnce({ data: { id: 51 } });
    mockedApiClient.post.mockResolvedValueOnce({ data: { id: 51 } });
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 51 } });

    await listClinicalNotes(12, { limit: 20, offset: 0, activo: true });
    await createClinicalNote(12, { contenido: 'Nota clínica' });
    await getClinicalNote(12, 51);
    await updateClinicalNote(12, 51, { contenido: 'Nota actualizada', activo: true });

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/consultas/12/notas', {
      params: { limit: 20, offset: 0, activo: true },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/consultas/12/notas', {
      contenido: 'Nota clínica',
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/consultas/12/notas/51');
    expect(mockedApiClient.patch).toHaveBeenCalledWith('/consultas/12/notas/51', {
      contenido: 'Nota actualizada',
      activo: true,
    });
  });

  it('loads active consultation reasons with pagination', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { items: [], total: 0, limit: 100, offset: 0 },
    });

    await listConsultationReasons({ limit: 100, offset: 0, activo: true });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/motivos-consulta', {
      params: { limit: 100, offset: 0, activo: true },
    });
  });
});
