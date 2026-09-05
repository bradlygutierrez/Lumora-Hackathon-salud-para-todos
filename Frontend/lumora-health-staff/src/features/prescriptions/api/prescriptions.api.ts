import { apiClient } from '@/src/shared/api/client';
import type {
  Medication,
  MedicationSchedule,
  MedicationScheduleCreate,
  Page,
  Prescription,
  PrescriptionCatalogItem,
  PrescriptionCreate,
  PrescriptionDetail,
  PrescriptionDetailCreate,
  PrescriptionDetailUpdate,
  PrescriptionUpdate,
} from '../types/prescription.types';

export async function listMedications(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<Medication[]> {
  const response = await apiClient.get<Medication[]>('/prescriptions/medications', {
    params,
  });
  return response.data;
}

export async function getMedication(medicationId: string): Promise<Medication> {
  const response = await apiClient.get<Medication>(
    `/prescriptions/medications/${medicationId}`,
  );
  return response.data;
}

export async function listPatientPrescriptions(
  patientId: number,
): Promise<Prescription[]> {
  const response = await apiClient.get<Prescription[]>(
    `/prescriptions/patient/${patientId}`,
  );
  return response.data;
}

export async function getPrescription(prescriptionId: string): Promise<Prescription> {
  const response = await apiClient.get<Prescription>(
    `/prescriptions/${prescriptionId}`,
  );
  return response.data;
}

export async function createPrescription(
  data: PrescriptionCreate,
): Promise<Prescription> {
  const response = await apiClient.post<Prescription>('/prescriptions', data);
  return response.data;
}

export async function updatePrescription(
  prescriptionId: string,
  data: PrescriptionUpdate,
): Promise<Prescription> {
  const response = await apiClient.patch<Prescription>(
    `/prescriptions/${prescriptionId}`,
    data,
  );
  return response.data;
}

export async function createPrescriptionDetail(
  prescriptionId: string,
  data: PrescriptionDetailCreate,
): Promise<PrescriptionDetail> {
  const response = await apiClient.post<PrescriptionDetail>(
    `/prescriptions/${prescriptionId}/detalles`,
    data,
  );
  return response.data;
}

export async function updatePrescriptionDetail(
  prescriptionId: string,
  detailId: string,
  data: PrescriptionDetailUpdate,
): Promise<PrescriptionDetail> {
  const response = await apiClient.patch<PrescriptionDetail>(
    `/prescriptions/${prescriptionId}/detalles/${detailId}`,
    data,
  );
  return response.data;
}

export async function deletePrescriptionDetail(
  prescriptionId: string,
  detailId: string,
): Promise<void> {
  await apiClient.delete(
    `/prescriptions/${prescriptionId}/detalles/${detailId}`,
  );
}

export async function listMedicationSchedules(
  detailId: string,
): Promise<MedicationSchedule[]> {
  const response = await apiClient.get<MedicationSchedule[]>(
    `/recetas/${detailId}/horarios`,
  );
  return response.data;
}

export async function createMedicationSchedule(
  detailId: string,
  data: MedicationScheduleCreate,
): Promise<MedicationSchedule> {
  const response = await apiClient.post<MedicationSchedule>(
    `/recetas/${detailId}/horarios`,
    data,
  );
  return response.data;
}

export async function deleteMedicationSchedule(scheduleId: string): Promise<void> {
  await apiClient.delete(`/horarios/${scheduleId}`);
}

async function listCatalog(
  path: string,
): Promise<Page<PrescriptionCatalogItem>> {
  const response = await apiClient.get<Page<PrescriptionCatalogItem>>(path, {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export function listPrescriptionStatuses() {
  return listCatalog('/estados-receta');
}

export function listAdministrationRoutes() {
  return listCatalog('/vias-administracion');
}

export function listMeasurementUnits() {
  return listCatalog('/unidades-medida');
}
