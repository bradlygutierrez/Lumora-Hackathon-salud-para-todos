import { apiClient } from '@/src/shared/api/client';
import type {
  Allergy,
  AllergyCreate,
  AllergyUpdate,
  CatalogItem,
  CatalogListParams,
  ClinicalListParams,
  Condition,
  ConditionCreate,
  ConditionHistory,
  ConditionUpdate,
  Disability,
  DisabilityCreate,
  DisabilityUpdate,
  MedicalHistoryCreate,
  MedicalHistoryEntry,
  MedicalHistoryUpdate,
  Page,
} from '../types/structured-history.types';

export async function listConditions(
  recordId: number,
  params: ClinicalListParams = {},
): Promise<Page<Condition>> {
  const response = await apiClient.get<Page<Condition>>(
    `/expedientes/${recordId}/condiciones`,
    { params },
  );
  return response.data;
}

export async function findCondition(recordId: number, conditionId: number): Promise<Condition | null> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await listConditions(recordId, { limit, offset });
    const condition = page.items.find((item) => item.id === conditionId);
    if (condition) return condition;

    const nextOffset = offset + page.items.length;
    if (page.items.length === 0 || nextOffset >= page.total) return null;
    offset = nextOffset;
  }
}

export async function createCondition(
  recordId: number,
  data: ConditionCreate,
): Promise<Condition> {
  const response = await apiClient.post<Condition>(
    `/expedientes/${recordId}/condiciones`,
    data,
  );
  return response.data;
}

export async function updateCondition(
  conditionId: number,
  data: ConditionUpdate,
): Promise<Condition> {
  const response = await apiClient.patch<Condition>(`/condiciones/${conditionId}`, data);
  return response.data;
}

export async function deleteCondition(conditionId: number): Promise<void> {
  await apiClient.delete(`/condiciones/${conditionId}`);
}

export async function listConditionHistory(
  conditionId: number,
  params: Pick<ClinicalListParams, 'limit' | 'offset'> = {},
): Promise<Page<ConditionHistory>> {
  const response = await apiClient.get<Page<ConditionHistory>>(
    `/condiciones/${conditionId}/historial`,
    { params },
  );
  return response.data;
}

export async function listAllergies(
  patientId: number,
  params: ClinicalListParams = {},
): Promise<Page<Allergy>> {
  const response = await apiClient.get<Page<Allergy>>(`/pacientes/${patientId}/alergias`, {
    params,
  });
  return response.data;
}

export async function getAllergy(patientId: number, allergyId: number): Promise<Allergy> {
  const response = await apiClient.get<Allergy>(`/pacientes/${patientId}/alergias/${allergyId}`);
  return response.data;
}

export async function createAllergy(
  patientId: number,
  data: AllergyCreate,
): Promise<Allergy> {
  const response = await apiClient.post<Allergy>(`/pacientes/${patientId}/alergias`, data);
  return response.data;
}

export async function updateAllergy(
  patientId: number,
  allergyId: number,
  data: AllergyUpdate,
): Promise<Allergy> {
  const response = await apiClient.patch<Allergy>(
    `/pacientes/${patientId}/alergias/${allergyId}`,
    data,
  );
  return response.data;
}

export async function deleteAllergy(patientId: number, allergyId: number): Promise<void> {
  await apiClient.delete(`/pacientes/${patientId}/alergias/${allergyId}`);
}

export async function listDisabilities(
  patientId: number,
  params: ClinicalListParams = {},
): Promise<Page<Disability>> {
  const response = await apiClient.get<Page<Disability>>(
    `/pacientes/${patientId}/discapacidades`,
    { params },
  );
  return response.data;
}

export async function getDisability(
  patientId: number,
  disabilityId: number,
): Promise<Disability> {
  const response = await apiClient.get<Disability>(
    `/pacientes/${patientId}/discapacidades/${disabilityId}`,
  );
  return response.data;
}

export async function createDisability(
  patientId: number,
  data: DisabilityCreate,
): Promise<Disability> {
  const response = await apiClient.post<Disability>(
    `/pacientes/${patientId}/discapacidades`,
    data,
  );
  return response.data;
}

export async function updateDisability(
  patientId: number,
  disabilityId: number,
  data: DisabilityUpdate,
): Promise<Disability> {
  const response = await apiClient.patch<Disability>(
    `/pacientes/${patientId}/discapacidades/${disabilityId}`,
    data,
  );
  return response.data;
}

export async function deleteDisability(patientId: number, disabilityId: number): Promise<void> {
  await apiClient.delete(`/pacientes/${patientId}/discapacidades/${disabilityId}`);
}

export async function listMedicalHistory(
  recordId: number,
  params: ClinicalListParams = {},
): Promise<Page<MedicalHistoryEntry>> {
  const response = await apiClient.get<Page<MedicalHistoryEntry>>(
    `/expedientes/${recordId}/antecedentes`,
    { params },
  );
  return response.data;
}

export async function getMedicalHistoryEntry(
  recordId: number,
  historyId: number,
): Promise<MedicalHistoryEntry> {
  const response = await apiClient.get<MedicalHistoryEntry>(
    `/expedientes/${recordId}/antecedentes/${historyId}`,
  );
  return response.data;
}

export async function createMedicalHistoryEntry(
  recordId: number,
  data: MedicalHistoryCreate,
): Promise<MedicalHistoryEntry> {
  const response = await apiClient.post<MedicalHistoryEntry>(
    `/expedientes/${recordId}/antecedentes`,
    data,
  );
  return response.data;
}

export async function updateMedicalHistoryEntry(
  recordId: number,
  historyId: number,
  data: MedicalHistoryUpdate,
): Promise<MedicalHistoryEntry> {
  const response = await apiClient.patch<MedicalHistoryEntry>(
    `/expedientes/${recordId}/antecedentes/${historyId}`,
    data,
  );
  return response.data;
}

export async function deleteMedicalHistoryEntry(
  recordId: number,
  historyId: number,
): Promise<void> {
  await apiClient.delete(`/expedientes/${recordId}/antecedentes/${historyId}`);
}

export async function listConditionStatuses(
  params: CatalogListParams = {},
): Promise<Page<CatalogItem>> {
  const response = await apiClient.get<Page<CatalogItem>>('/estados-condicion', { params });
  return response.data;
}

export async function listMedicalHistoryTypes(
  params: CatalogListParams = {},
): Promise<Page<CatalogItem>> {
  const response = await apiClient.get<Page<CatalogItem>>('/tipos-antecedente', { params });
  return response.data;
}

export async function listSeverityLevels(
  params: Omit<CatalogListParams, 'activo'> = {},
): Promise<Page<CatalogItem>> {
  const response = await apiClient.get<Page<CatalogItem>>('/niveles-severidad', { params });
  return response.data;
}
