import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  createAllergy,
  createCondition,
  createDisability,
  createMedicalHistoryEntry,
  deleteAllergy,
  deleteCondition,
  deleteDisability,
  deleteMedicalHistoryEntry,
  findCondition,
  getAllergy,
  getDisability,
  getMedicalHistoryEntry,
  listAllergies,
  listConditionHistory,
  listConditions,
  listConditionStatuses,
  listDisabilities,
  listMedicalHistory,
  listMedicalHistoryTypes,
  listSeverityLevels,
  updateAllergy,
  updateCondition,
  updateDisability,
  updateMedicalHistoryEntry,
} from '../api/structured-history.api';
import {
  createPreviewAllergy,
  createPreviewCondition,
  createPreviewDisability,
  createPreviewMedicalHistoryEntry,
  deletePreviewAllergy,
  deletePreviewCondition,
  deletePreviewDisability,
  deletePreviewMedicalHistoryEntry,
  getPreviewAllergy,
  getPreviewCondition,
  getPreviewDisability,
  getPreviewMedicalHistoryEntry,
  listPreviewAllergies,
  listPreviewConditionHistory,
  listPreviewConditions,
  listPreviewDisabilities,
  listPreviewMedicalHistory,
  previewConditionStatuses,
  previewMedicalHistoryTypes,
  previewSeverityLevels,
  updatePreviewAllergy,
  updatePreviewCondition,
  updatePreviewDisability,
  updatePreviewMedicalHistoryEntry,
} from '../preview/structured-history-preview';
import type {
  AllergyCreate,
  AllergyUpdate,
  CatalogItem,
  ClinicalListParams,
  ConditionCreate,
  ConditionUpdate,
  DisabilityCreate,
  DisabilityUpdate,
  MedicalHistoryCreate,
  MedicalHistoryUpdate,
  Page,
} from '../types/structured-history.types';

export const structuredHistoryKeys = {
  all: ['clinical', 'structured-history'] as const,
  conditions: (recordId: number, params: object) =>
    [...structuredHistoryKeys.all, 'records', recordId, 'conditions', params] as const,
  condition: (recordId: number, conditionId: number) =>
    [...structuredHistoryKeys.all, 'records', recordId, 'conditions', conditionId] as const,
  conditionHistory: (conditionId: number, params: object) =>
    [...structuredHistoryKeys.all, 'conditions', conditionId, 'history', params] as const,
  allergies: (patientId: number, params: object) =>
    [...structuredHistoryKeys.all, 'patients', patientId, 'allergies', params] as const,
  allergy: (patientId: number, allergyId: number) =>
    [...structuredHistoryKeys.all, 'patients', patientId, 'allergies', allergyId] as const,
  disabilities: (patientId: number, params: object) =>
    [...structuredHistoryKeys.all, 'patients', patientId, 'disabilities', params] as const,
  disability: (patientId: number, disabilityId: number) =>
    [...structuredHistoryKeys.all, 'patients', patientId, 'disabilities', disabilityId] as const,
  medicalHistory: (recordId: number, params: object) =>
    [...structuredHistoryKeys.all, 'records', recordId, 'medical-history', params] as const,
  medicalHistoryEntry: (recordId: number, historyId: number) =>
    [...structuredHistoryKeys.all, 'records', recordId, 'medical-history', historyId] as const,
  conditionStatuses: ['clinical', 'catalogs', 'condition-statuses'] as const,
  historyTypes: ['clinical', 'catalogs', 'medical-history-types'] as const,
  severityLevels: ['clinical', 'catalogs', 'severity-levels'] as const,
};

function usePreviewMode() {
  const { session } = useAuthSession();
  return session?.isPreview === true;
}

function pageFromCatalog(items: CatalogItem[], limit = 100, offset = 0): Page<CatalogItem> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}

async function invalidateClinicalViews(
  queryClient: QueryClient,
  patientId: number,
  recordId: number,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: structuredHistoryKeys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.clinical.patientSummary(patientId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(patientId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.medicalRecordTimeline(recordId),
    }),
  ]);
}

export function useConditionStatuses(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: structuredHistoryKeys.conditionStatuses,
    queryFn: () =>
      preview
        ? Promise.resolve(pageFromCatalog(previewConditionStatuses))
        : listConditionStatuses({ limit: 100, offset: 0, activo: true }),
  });
}

export function useMedicalHistoryTypes(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: structuredHistoryKeys.historyTypes,
    queryFn: () =>
      preview
        ? Promise.resolve(pageFromCatalog(previewMedicalHistoryTypes))
        : listMedicalHistoryTypes({ limit: 100, offset: 0, activo: true }),
  });
}

export function useSeverityLevels(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: structuredHistoryKeys.severityLevels,
    queryFn: () =>
      preview
        ? Promise.resolve(pageFromCatalog(previewSeverityLevels))
        : listSeverityLevels({ limit: 100, offset: 0 }),
  });
}

export function useConditions(
  recordId: number,
  params: ClinicalListParams = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };
  return useQuery({
    enabled: enabled && Number.isFinite(recordId) && recordId > 0,
    queryKey: structuredHistoryKeys.conditions(recordId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewConditions(recordId, normalized))
        : listConditions(recordId, normalized),
  });
}

export function useCondition(recordId: number, conditionId: number, enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled:
      enabled &&
      Number.isFinite(recordId) &&
      recordId > 0 &&
      Number.isFinite(conditionId) &&
      conditionId > 0,
    queryKey: structuredHistoryKeys.condition(recordId, conditionId),
    queryFn: () =>
      preview
        ? Promise.resolve(getPreviewCondition(recordId, conditionId))
        : findCondition(recordId, conditionId),
  });
}

export function useConditionHistory(
  recordId: number,
  conditionId: number,
  params: Pick<ClinicalListParams, 'limit' | 'offset'> = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = { limit: params.limit ?? 10, offset: params.offset ?? 0 };
  return useQuery({
    enabled:
      enabled &&
      Number.isFinite(conditionId) &&
      conditionId > 0 &&
      Number.isFinite(recordId) &&
      recordId > 0,
    queryKey: structuredHistoryKeys.conditionHistory(conditionId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewConditionHistory(recordId, conditionId, normalized))
        : listConditionHistory(conditionId, normalized),
  });
}

export function useAllergies(
  patientId: number,
  params: ClinicalListParams = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };
  return useQuery({
    enabled: enabled && Number.isFinite(patientId) && patientId > 0,
    queryKey: structuredHistoryKeys.allergies(patientId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewAllergies(patientId, normalized))
        : listAllergies(patientId, normalized),
  });
}

export function useAllergy(patientId: number, allergyId: number, enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled:
      enabled &&
      Number.isFinite(patientId) &&
      patientId > 0 &&
      Number.isFinite(allergyId) &&
      allergyId > 0,
    queryKey: structuredHistoryKeys.allergy(patientId, allergyId),
    queryFn: () =>
      preview
        ? Promise.resolve(getPreviewAllergy(patientId, allergyId))
        : getAllergy(patientId, allergyId),
  });
}

export function useDisabilities(
  patientId: number,
  params: ClinicalListParams = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };
  return useQuery({
    enabled: enabled && Number.isFinite(patientId) && patientId > 0,
    queryKey: structuredHistoryKeys.disabilities(patientId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewDisabilities(patientId, normalized))
        : listDisabilities(patientId, normalized),
  });
}

export function useDisability(patientId: number, disabilityId: number, enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled:
      enabled &&
      Number.isFinite(patientId) &&
      patientId > 0 &&
      Number.isFinite(disabilityId) &&
      disabilityId > 0,
    queryKey: structuredHistoryKeys.disability(patientId, disabilityId),
    queryFn: () =>
      preview
        ? Promise.resolve(getPreviewDisability(patientId, disabilityId))
        : getDisability(patientId, disabilityId),
  });
}

export function useMedicalHistoryEntries(
  recordId: number,
  params: ClinicalListParams = {},
  enabled = true,
) {
  const preview = usePreviewMode();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };
  return useQuery({
    enabled: enabled && Number.isFinite(recordId) && recordId > 0,
    queryKey: structuredHistoryKeys.medicalHistory(recordId, normalized),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewMedicalHistory(recordId, normalized))
        : listMedicalHistory(recordId, normalized),
  });
}

export function useMedicalHistoryEntry(recordId: number, historyId: number, enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled:
      enabled &&
      Number.isFinite(recordId) &&
      recordId > 0 &&
      Number.isFinite(historyId) &&
      historyId > 0,
    queryKey: structuredHistoryKeys.medicalHistoryEntry(recordId, historyId),
    queryFn: () =>
      preview
        ? Promise.resolve(getPreviewMedicalHistoryEntry(recordId, historyId))
        : getMedicalHistoryEntry(recordId, historyId),
  });
}

export function useCreateCondition(recordId: number, patientId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConditionCreate) =>
      preview
        ? Promise.resolve(createPreviewCondition(recordId, patientId, data))
        : createCondition(recordId, data),
    onSuccess: async (condition) => {
      queryClient.setQueryData(
        structuredHistoryKeys.condition(recordId, condition.id),
        condition,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdateCondition(recordId: number, patientId: number, conditionId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConditionUpdate) =>
      preview
        ? Promise.resolve(updatePreviewCondition(recordId, conditionId, data))
        : updateCondition(conditionId, data),
    onSuccess: async (condition) => {
      queryClient.setQueryData(
        structuredHistoryKeys.condition(recordId, conditionId),
        condition,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeleteCondition(recordId: number, patientId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conditionId: number) => {
      if (preview) {
        deletePreviewCondition(recordId, conditionId);
        return Promise.resolve();
      }
      return deleteCondition(conditionId);
    },
    onSuccess: async () => {
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useCreateAllergy(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AllergyCreate) =>
      preview
        ? Promise.resolve(createPreviewAllergy(patientId, recordId, data))
        : createAllergy(patientId, data),
    onSuccess: async (allergy) => {
      queryClient.setQueryData(structuredHistoryKeys.allergy(patientId, allergy.id), allergy);
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdateAllergy(
  patientId: number,
  recordId: number,
  allergyId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AllergyUpdate) =>
      preview
        ? Promise.resolve(updatePreviewAllergy(patientId, recordId, allergyId, data))
        : updateAllergy(patientId, allergyId, data),
    onSuccess: async (allergy) => {
      queryClient.setQueryData(structuredHistoryKeys.allergy(patientId, allergyId), allergy);
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeleteAllergy(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (allergyId: number) => {
      if (preview) {
        deletePreviewAllergy(patientId, recordId, allergyId);
        return Promise.resolve();
      }
      return deleteAllergy(patientId, allergyId);
    },
    onSuccess: async () => {
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useCreateDisability(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DisabilityCreate) =>
      preview
        ? Promise.resolve(createPreviewDisability(patientId, recordId, data))
        : createDisability(patientId, data),
    onSuccess: async (disability) => {
      queryClient.setQueryData(
        structuredHistoryKeys.disability(patientId, disability.id),
        disability,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdateDisability(
  patientId: number,
  recordId: number,
  disabilityId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DisabilityUpdate) =>
      preview
        ? Promise.resolve(
            updatePreviewDisability(patientId, recordId, disabilityId, data),
          )
        : updateDisability(patientId, disabilityId, data),
    onSuccess: async (disability) => {
      queryClient.setQueryData(
        structuredHistoryKeys.disability(patientId, disabilityId),
        disability,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeleteDisability(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (disabilityId: number) => {
      if (preview) {
        deletePreviewDisability(patientId, recordId, disabilityId);
        return Promise.resolve();
      }
      return deleteDisability(patientId, disabilityId);
    },
    onSuccess: async () => {
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useCreateMedicalHistoryEntry(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicalHistoryCreate) =>
      preview
        ? Promise.resolve(createPreviewMedicalHistoryEntry(patientId, recordId, data))
        : createMedicalHistoryEntry(recordId, data),
    onSuccess: async (entry) => {
      queryClient.setQueryData(
        structuredHistoryKeys.medicalHistoryEntry(recordId, entry.id),
        entry,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdateMedicalHistoryEntry(
  patientId: number,
  recordId: number,
  historyId: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicalHistoryUpdate) =>
      preview
        ? Promise.resolve(
            updatePreviewMedicalHistoryEntry(patientId, recordId, historyId, data),
          )
        : updateMedicalHistoryEntry(recordId, historyId, data),
    onSuccess: async (entry) => {
      queryClient.setQueryData(
        structuredHistoryKeys.medicalHistoryEntry(recordId, historyId),
        entry,
      );
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeleteMedicalHistoryEntry(patientId: number, recordId: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId: number) => {
      if (preview) {
        deletePreviewMedicalHistoryEntry(patientId, recordId, historyId);
        return Promise.resolve();
      }
      return deleteMedicalHistoryEntry(recordId, historyId);
    },
    onSuccess: async () => {
      await invalidateClinicalViews(queryClient, patientId, recordId);
    },
  });
}
