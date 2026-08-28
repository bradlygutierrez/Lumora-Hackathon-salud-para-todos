import { apiClient } from '@/src/shared/api/client';
import type {
  CatalogItem,
  Page,
  Patient,
  PatientClinicalSummary,
  PatientDetail,
  PatientFamilyRelationship,
  PatientListParams,
  StaffPatientRegistrationPayload,
} from '../types/patient.types';

export async function listPatients(params: PatientListParams = {}): Promise<Page<Patient>> {
  const response = await apiClient.get<Page<Patient>>('/pacientes', { params });
  return response.data;
}

export async function getPatient(patientId: number): Promise<PatientDetail> {
  const response = await apiClient.get<PatientDetail>(`/pacientes/${patientId}`);
  return response.data;
}

export async function registerClinicalPatient(
  payload: StaffPatientRegistrationPayload,
): Promise<PatientDetail> {
  const response = await apiClient.post<PatientDetail>('/pacientes/registro-clinico', payload);
  return response.data;
}

export async function getPatientFamily(patientId: number): Promise<PatientFamilyRelationship[]> {
  const response = await apiClient.get<PatientFamilyRelationship[]>(
    `/pacientes/${patientId}/familiares`,
  );
  return response.data;
}

export async function listSexes(): Promise<Page<CatalogItem>> {
  const response = await apiClient.get<Page<CatalogItem>>('/sexos', {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export async function listBloodTypes(): Promise<Page<CatalogItem>> {
  const response = await apiClient.get<Page<CatalogItem>>('/tipos-sangre', {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export async function getPatientClinicalSummary(
  patientId: number,
): Promise<PatientClinicalSummary> {
  const response = await apiClient.get<PatientClinicalSummary>(
    `/pacientes/${patientId}/resumen-clinico`,
  );
  return response.data;
}
