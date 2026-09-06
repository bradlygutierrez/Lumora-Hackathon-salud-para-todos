import { apiClient } from '@/src/shared/api/client';
import type {
  Diagnosis,
  DiagnosisCreate,
  DiagnosisListParams,
  DiagnosisTypeCatalogItem,
  DiagnosisUpdate,
  Page,
} from '../types/diagnosis.types';

export async function listDiagnoses(
  consultationId: number,
  params: DiagnosisListParams = {},
): Promise<Page<Diagnosis>> {
  const response = await apiClient.get<Page<Diagnosis>>(
    `/consultas/${consultationId}/diagnosticos`,
    { params },
  );
  return response.data;
}

export async function getDiagnosis(diagnosisId: number): Promise<Diagnosis> {
  const response = await apiClient.get<Diagnosis>(`/diagnosticos/${diagnosisId}`);
  return response.data;
}

export async function createDiagnosis(
  consultationId: number,
  data: DiagnosisCreate,
): Promise<Diagnosis> {
  const response = await apiClient.post<Diagnosis>(
    `/consultas/${consultationId}/diagnosticos`,
    data,
  );
  return response.data;
}

export async function updateDiagnosis(
  diagnosisId: number,
  data: DiagnosisUpdate,
): Promise<Diagnosis> {
  const response = await apiClient.patch<Diagnosis>(
    `/diagnosticos/${diagnosisId}`,
    data,
  );
  return response.data;
}

export async function deleteDiagnosis(diagnosisId: number): Promise<void> {
  await apiClient.delete(`/diagnosticos/${diagnosisId}`);
}

export async function listDiagnosisTypes(params: {
  limit?: number;
  offset?: number;
  activo?: boolean;
} = {}): Promise<Page<DiagnosisTypeCatalogItem>> {
  const response = await apiClient.get<Page<DiagnosisTypeCatalogItem>>(
    '/tipos-diagnostico',
    { params },
  );
  return response.data;
}
