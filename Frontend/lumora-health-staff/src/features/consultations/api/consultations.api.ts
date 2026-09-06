import { apiClient } from '@/src/shared/api/client';
import type {
  ClinicalNote,
  ClinicalNoteCreate,
  ClinicalNoteListParams,
  ClinicalNoteUpdate,
  Consultation,
  ConsultationCreate,
  ConsultationListParams,
  ConsultationReason,
  ConsultationReasonListParams,
  ConsultationUpdate,
  Page,
  RecordConsultationListParams,
  VitalSigns,
  VitalSignsCreate,
  VitalSignsListParams,
} from '../types/consultation.types';

export async function listConsultations(
  params: ConsultationListParams = {},
): Promise<Page<Consultation>> {
  const response = await apiClient.get<Page<Consultation>>('/consultas', { params });
  return response.data;
}

export async function listRecordConsultations(
  recordId: number,
  params: RecordConsultationListParams = {},
): Promise<Page<Consultation>> {
  const response = await apiClient.get<Page<Consultation>>(
    `/expedientes/${recordId}/consultas`,
    { params },
  );
  return response.data;
}

export async function getConsultation(consultationId: number): Promise<Consultation> {
  const response = await apiClient.get<Consultation>(`/consultas/${consultationId}`);
  return response.data;
}

export async function createConsultation(data: ConsultationCreate): Promise<Consultation> {
  const response = await apiClient.post<Consultation>('/consultas', data);
  return response.data;
}

export async function updateConsultation(
  consultationId: number,
  data: ConsultationUpdate,
): Promise<Consultation> {
  const response = await apiClient.patch<Consultation>(`/consultas/${consultationId}`, data);
  return response.data;
}

export async function listVitalSigns(
  consultationId: number,
  params: VitalSignsListParams = {},
): Promise<Page<VitalSigns>> {
  const response = await apiClient.get<Page<VitalSigns>>(
    `/consultas/${consultationId}/signos-vitales`,
    { params },
  );
  return response.data;
}

export async function createVitalSigns(
  consultationId: number,
  data: VitalSignsCreate,
): Promise<VitalSigns> {
  const response = await apiClient.post<VitalSigns>(
    `/consultas/${consultationId}/signos-vitales`,
    data,
  );
  return response.data;
}

export async function listClinicalNotes(
  consultationId: number,
  params: ClinicalNoteListParams = {},
): Promise<Page<ClinicalNote>> {
  const response = await apiClient.get<Page<ClinicalNote>>(
    `/consultas/${consultationId}/notas`,
    { params },
  );
  return response.data;
}

export async function createClinicalNote(
  consultationId: number,
  data: ClinicalNoteCreate,
): Promise<ClinicalNote> {
  const response = await apiClient.post<ClinicalNote>(
    `/consultas/${consultationId}/notas`,
    data,
  );
  return response.data;
}

export async function getClinicalNote(
  consultationId: number,
  noteId: number,
): Promise<ClinicalNote> {
  const response = await apiClient.get<ClinicalNote>(
    `/consultas/${consultationId}/notas/${noteId}`,
  );
  return response.data;
}

export async function updateClinicalNote(
  consultationId: number,
  noteId: number,
  data: ClinicalNoteUpdate,
): Promise<ClinicalNote> {
  const response = await apiClient.patch<ClinicalNote>(
    `/consultas/${consultationId}/notas/${noteId}`,
    data,
  );
  return response.data;
}

export async function listConsultationReasons(
  params: ConsultationReasonListParams = {},
): Promise<Page<ConsultationReason>> {
  const response = await apiClient.get<Page<ConsultationReason>>('/motivos-consulta', {
    params,
  });
  return response.data;
}
