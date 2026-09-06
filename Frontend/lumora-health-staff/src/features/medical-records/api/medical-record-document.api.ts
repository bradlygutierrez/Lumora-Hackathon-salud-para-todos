import { apiClient } from '@/src/shared/api/client';
import type {
  MedicalRecordDocument,
  MedicalRecordPdfPayload,
} from '../types/medical-record-document.types';

function normalizeFilename(value: string | undefined, patientId: number) {
  const fallback = `lumora-expediente-${patientId}.pdf`;
  if (!value) return fallback;

  const match = /filename="?([^";]+)"?/i.exec(value);
  const candidate = match?.[1]?.trim();
  if (!candidate) return fallback;

  const safe = candidate
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-');

  return safe.toLowerCase().endsWith('.pdf') ? safe : fallback;
}

export async function getMedicalRecordDocument(
  patientId: number,
): Promise<MedicalRecordDocument> {
  const response = await apiClient.get<MedicalRecordDocument>(
    `/patients/${patientId}/medical-record-document`,
  );
  return response.data;
}

export async function getMedicalRecordDocumentPdf(
  patientId: number,
): Promise<MedicalRecordPdfPayload> {
  const response = await apiClient.get<ArrayBuffer>(
    `/patients/${patientId}/medical-record-document/pdf`,
    { responseType: 'arraybuffer' },
  );

  return {
    bytes: new Uint8Array(response.data),
    filename: normalizeFilename(
      response.headers['content-disposition'] as string | undefined,
      patientId,
    ),
  };
}
