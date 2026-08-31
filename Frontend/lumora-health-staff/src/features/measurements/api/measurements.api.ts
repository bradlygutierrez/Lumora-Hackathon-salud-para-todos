import { apiClient } from '@/src/shared/api/client';
import type {
  CatalogPage,
  HealthIndicator,
  PatientMeasurement,
} from '../types/measurement.types';

export async function listPatientMeasurements(
  patientId: number,
): Promise<PatientMeasurement[]> {
  const response = await apiClient.get<PatientMeasurement[]>(
    `/health-indicators/patients/${patientId}/measurements`,
  );
  return response.data;
}

export async function listHealthIndicators(): Promise<HealthIndicator[]> {
  const response = await apiClient.get<HealthIndicator[]>(
    '/health-indicators/indicators',
  );
  return response.data;
}

export async function listMeasurementUnits(): Promise<CatalogPage> {
  const response = await apiClient.get<CatalogPage>('/unidades-medida', {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export async function listMeasurementOrigins(): Promise<CatalogPage> {
  const response = await apiClient.get<CatalogPage>('/origenes-registro', {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}
