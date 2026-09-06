import { apiClient } from '@/src/shared/api/client';
import type {
  ClinicalTimelineItem,
  MedicalTimelineParams,
  Page,
  PatientClinicalSummary,
} from '../types/medical-record.types';

export async function getMedicalRecordSummary(
  patientId: number,
): Promise<PatientClinicalSummary> {
  const response = await apiClient.get<PatientClinicalSummary>(
    `/pacientes/${patientId}/resumen-clinico`,
  );
  return response.data;
}

export async function getMedicalRecordTimeline(
  recordId: number,
  params: MedicalTimelineParams = {},
): Promise<Page<ClinicalTimelineItem>> {
  const response = await apiClient.get<Page<ClinicalTimelineItem>>(
    `/expedientes/${recordId}/timeline`,
    { params },
  );
  return response.data;
}
