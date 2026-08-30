import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  createDiagnosis,
  deleteDiagnosis,
  getDiagnosis,
  listDiagnoses,
  listDiagnosisTypes,
  updateDiagnosis,
} from '../api/diagnoses.api';
import {
  createPreviewDiagnosis,
  deletePreviewDiagnosis,
  getPreviewDiagnosis,
  listPreviewDiagnoses,
  previewDiagnosisTypes,
  updatePreviewDiagnosis,
} from '../preview/diagnoses-preview';
import type {
  DiagnosisCreate,
  DiagnosisListParams,
  DiagnosisTypeCatalogItem,
  DiagnosisUpdate,
  Page,
} from '../types/diagnosis.types';

export const diagnosisKeys = {
  all: ['clinical', 'diagnoses'] as const,
  list: (consultationId: number, params: object) =>
    [...diagnosisKeys.all, 'consultation', consultationId, params] as const,
  detail: (diagnosisId: number) =>
    [...diagnosisKeys.all, 'detail', diagnosisId] as const,
  types: ['clinical', 'catalogs', 'diagnosis-types'] as const,
};

function usePreviewMode() {
  const { session } = useAuthSession();
  return session?.isPreview === true;
}

function catalogPage(items: DiagnosisTypeCatalogItem[]): Page<DiagnosisTypeCatalogItem> {
  return { items, total: items.length, limit: 100, offset: 0 };
}

export async function invalidateDiagnosisViews(
  queryClient: QueryClient,
  patientId: number,
  recordId: number,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: diagnosisKeys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.clinical.patientSummary(patientId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(patientId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.medicalRecordTimeline(recordId),
    }),
  ]);
}

export function useDiagnosisTypes(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: diagnosisKeys.types,
    queryFn: () =>
      preview
        ? Promise.resolve(catalogPage(previewDiagnosisTypes))
        : listDiagnosisTypes({ limit: 100, offset: 0, activo: true }),
  });
}

export function useDiagnoses(
  patientId: number,
  recordId: number,
  consultationId: number,
  params: DiagnosisListParams = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = { limit: params.limit ?? 20, offset: params.offset ?? 0 };
  return useQuery({
    enabled:
      enabled &&
      patientId > 0 &&
      recordId > 0 &&
      consultationId > 0,
    queryKey: diagnosisKeys.list(consultationId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(
            listPreviewDiagnoses(patientId, consultationId, normalized),
          )
        : listDiagnoses(consultationId, normalized),
  });
}

export function useDiagnosis(
  patientId: number,
  consultationId: number,
  diagnosisId: number,
  enabled = true,
) {
  const preview = usePreviewMode();
  return useQuery({
    enabled: enabled && diagnosisId > 0,
    queryKey: diagnosisKeys.detail(diagnosisId),
    queryFn: () =>
      preview
        ? Promise.resolve(
            getPreviewDiagnosis(patientId, consultationId, diagnosisId),
          )
        : getDiagnosis(diagnosisId),
  });
}

export function useCreateDiagnosis(
  patientId: number,
  recordId: number,
  consultationId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiagnosisCreate) =>
      preview
        ? Promise.resolve(createPreviewDiagnosis(patientId, consultationId, data))
        : createDiagnosis(consultationId, data),
    onSuccess: async (diagnosis) => {
      queryClient.setQueryData(diagnosisKeys.detail(diagnosis.id), diagnosis);
      await invalidateDiagnosisViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdateDiagnosis(
  patientId: number,
  recordId: number,
  consultationId: number,
  diagnosisId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiagnosisUpdate) =>
      preview
        ? Promise.resolve(
            updatePreviewDiagnosis(patientId, consultationId, diagnosisId, data),
          )
        : updateDiagnosis(diagnosisId, data),
    onSuccess: async (diagnosis) => {
      queryClient.setQueryData(diagnosisKeys.detail(diagnosisId), diagnosis);
      await invalidateDiagnosisViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeleteDiagnosis(
  patientId: number,
  recordId: number,
  consultationId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (diagnosisId: number) => {
      if (preview) {
        deletePreviewDiagnosis(patientId, consultationId, diagnosisId);
        return Promise.resolve();
      }
      return deleteDiagnosis(diagnosisId);
    },
    onSuccess: async () => {
      await invalidateDiagnosisViews(queryClient, patientId, recordId);
    },
  });
}
