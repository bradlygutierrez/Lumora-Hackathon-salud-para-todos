import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/src/shared/api/query-keys';
import {
  getMedicalRecordDocument,
  getMedicalRecordDocumentPdf,
} from '../api/medical-record-document.api';

export function useMedicalRecordDocument(patientId: number) {
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: queryKeys.clinical.medicalRecordDocument(patientId),
    queryFn: () => getMedicalRecordDocument(patientId),
    refetchOnWindowFocus: true,
  });
}

export function useMedicalRecordDocumentPdf(patientId: number) {
  return useMutation({
    mutationFn: () => getMedicalRecordDocumentPdf(patientId),
  });
}
