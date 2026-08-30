import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  createPrescription,
  createPrescriptionDetail,
  deletePrescriptionDetail,
  getPrescription,
  listAdministrationRoutes,
  listMeasurementUnits,
  listMedications,
  listPatientPrescriptions,
  listPrescriptionStatuses,
  updatePrescription,
  updatePrescriptionDetail,
} from '../api/prescriptions.api';
import {
  createPreviewPrescription,
  createPreviewPrescriptionDetail,
  deletePreviewPrescriptionDetail,
  getPreviewPrescription,
  listPreviewMedications,
  listPreviewPrescriptions,
  previewAdministrationRoutes,
  previewMeasurementUnits,
  previewPrescriptionStatuses,
  updatePreviewPrescription,
  updatePreviewPrescriptionDetail,
} from '../preview/prescriptions-preview';
import type {
  PrescriptionCatalogItem,
  PrescriptionCreate,
  PrescriptionDetailCreate,
  PrescriptionDetailUpdate,
  PrescriptionUpdate,
} from '../types/prescription.types';

export const prescriptionKeys = {
  all: ['clinical', 'prescriptions'] as const,
  patient: (patientId: number) =>
    [...prescriptionKeys.all, 'patient', patientId] as const,
  detail: (prescriptionId: string) =>
    [...prescriptionKeys.all, 'detail', prescriptionId] as const,
  statuses: ['clinical', 'catalogs', 'prescription-statuses'] as const,
  medications: ['clinical', 'catalogs', 'medications'] as const,
  routes: ['clinical', 'catalogs', 'administration-routes'] as const,
  units: ['clinical', 'catalogs', 'measurement-units'] as const,
};

function usePreviewMode() {
  const { session } = useAuthSession();
  return session?.isPreview === true;
}

function page(items: PrescriptionCatalogItem[]) {
  return { items, total: items.length, limit: 100, offset: 0 };
}

export async function invalidatePrescriptionViews(
  queryClient: QueryClient,
  patientId: number,
  recordId?: number,
) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: prescriptionKeys.patient(patientId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.clinical.patientSummary(patientId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(patientId),
    }),
  ];
  if (recordId && recordId > 0) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.clinical.medicalRecordTimeline(recordId),
      }),
    );
  }
  await Promise.all(invalidations);
}

export function usePrescriptionStatuses(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: prescriptionKeys.statuses,
    queryFn: () =>
      preview
        ? Promise.resolve(page(previewPrescriptionStatuses))
        : listPrescriptionStatuses(),
  });
}

export function usePrescriptionMedications(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: prescriptionKeys.medications,
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewMedications())
        : listMedications({ limit: 100, offset: 0 }),
  });
}

export function useAdministrationRoutes(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: prescriptionKeys.routes,
    queryFn: () =>
      preview
        ? Promise.resolve(page(previewAdministrationRoutes))
        : listAdministrationRoutes(),
  });
}

export function useMeasurementUnits(enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled,
    queryKey: prescriptionKeys.units,
    queryFn: () =>
      preview
        ? Promise.resolve(page(previewMeasurementUnits))
        : listMeasurementUnits(),
  });
}

export function usePatientPrescriptions(patientId: number, enabled = true) {
  const preview = usePreviewMode();
  return useQuery({
    enabled: enabled && patientId > 0,
    queryKey: prescriptionKeys.patient(patientId),
    queryFn: () =>
      preview
        ? Promise.resolve(listPreviewPrescriptions(patientId))
        : listPatientPrescriptions(patientId),
  });
}

export function usePrescription(
  patientId: number,
  prescriptionId: string,
  enabled = true,
) {
  const preview = usePreviewMode();
  return useQuery({
    enabled: enabled && patientId > 0 && prescriptionId.length > 0,
    queryKey: prescriptionKeys.detail(prescriptionId),
    queryFn: () =>
      preview
        ? Promise.resolve(getPreviewPrescription(patientId, prescriptionId))
        : getPrescription(prescriptionId),
  });
}

export function useCreatePrescription(patientId: number, recordId?: number) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrescriptionCreate) =>
      preview
        ? Promise.resolve(createPreviewPrescription(patientId, data))
        : createPrescription(data),
    onSuccess: async (prescription) => {
      queryClient.setQueryData(
        prescriptionKeys.detail(prescription.id),
        prescription,
      );
      await invalidatePrescriptionViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdatePrescription(
  patientId: number,
  prescriptionId: string,
  recordId?: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrescriptionUpdate) =>
      preview
        ? Promise.resolve(
            updatePreviewPrescription(patientId, prescriptionId, data),
          )
        : updatePrescription(prescriptionId, data),
    onSuccess: async (prescription) => {
      queryClient.setQueryData(
        prescriptionKeys.detail(prescriptionId),
        prescription,
      );
      await invalidatePrescriptionViews(queryClient, patientId, recordId);
    },
  });
}

export function useCreatePrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  recordId?: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrescriptionDetailCreate) =>
      preview
        ? Promise.resolve(
            createPreviewPrescriptionDetail(patientId, prescriptionId, data),
          )
        : createPrescriptionDetail(prescriptionId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: prescriptionKeys.detail(prescriptionId),
      });
      await invalidatePrescriptionViews(queryClient, patientId, recordId);
    },
  });
}

export function useUpdatePrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  detailId: string,
  recordId?: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrescriptionDetailUpdate) =>
      preview
        ? Promise.resolve(
            updatePreviewPrescriptionDetail(
              patientId,
              prescriptionId,
              detailId,
              data,
            ),
          )
        : updatePrescriptionDetail(prescriptionId, detailId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: prescriptionKeys.detail(prescriptionId),
      });
      await invalidatePrescriptionViews(queryClient, patientId, recordId);
    },
  });
}

export function useDeletePrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  recordId?: number,
) {
  const preview = usePreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (detailId: string) => {
      if (preview) {
        deletePreviewPrescriptionDetail(patientId, prescriptionId, detailId);
        return Promise.resolve();
      }
      return deletePrescriptionDetail(prescriptionId, detailId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: prescriptionKeys.detail(prescriptionId),
      });
      await invalidatePrescriptionViews(queryClient, patientId, recordId);
    },
  });
}
