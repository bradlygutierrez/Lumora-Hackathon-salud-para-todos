import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import { getMedicalRecordSummary, getMedicalRecordTimeline } from '../api/medical-records.api';
import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from '../preview/medical-record-preview';
import type {
  ClinicalTimelineItem,
  MedicalTimelineParams,
  Page,
  PatientClinicalSummary,
} from '../types/medical-record.types';

function useMedicalRecordPreviewMode() {
  const { session } = useAuthSession();
  return session?.isPreview === true;
}

function previewSummary(patientId: number): PatientClinicalSummary {
  const summary = previewMedicalRecordSummaries[patientId];
  if (!summary) {
    return {
      paciente_id: patientId,
      paciente: {
        id: patientId,
        nombres: 'Paciente',
        apellidos: 'Preview',
        fecha_nacimiento: null,
        sexo_id: null,
      },
      expediente: null,
      antecedentes: [],
      alergias: [],
      discapacidades: [],
      condiciones: [],
      consultas: [],
      recetas: [],
      mediciones: [],
      alertas: [],
    };
  }
  return summary;
}

function previewTimelinePage(
  recordId: number,
  params: Required<Pick<MedicalTimelineParams, 'limit' | 'offset'>> & Pick<MedicalTimelineParams, 'tipo'>,
): Page<ClinicalTimelineItem> {
  const items = (previewMedicalTimeline[recordId] ?? []).filter(
    (item) => !params.tipo || item.tipo === params.tipo,
  );
  return {
    items: items.slice(params.offset, params.offset + params.limit),
    total: items.length,
    limit: params.limit,
    offset: params.offset,
  };
}

export function useMedicalRecordSummary(patientId: number) {
  const isPreview = useMedicalRecordPreviewMode();
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: queryKeys.clinical.patientSummary(patientId),
    queryFn: () =>
      isPreview
        ? Promise.resolve(previewSummary(patientId))
        : getMedicalRecordSummary(patientId),
  });
}

export function useMedicalRecordTimeline(
  recordId: number,
  params: Pick<MedicalTimelineParams, 'limit' | 'tipo'> = {},
) {
  const isPreview = useMedicalRecordPreviewMode();
  const limit = params.limit ?? 10;
  const tipo = params.tipo || undefined;

  return useInfiniteQuery({
    enabled: Number.isFinite(recordId) && recordId > 0,
    queryKey: [...queryKeys.clinical.medicalRecordTimeline(recordId), { limit, tipo }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const pageParams = { limit, offset: pageParam, tipo };
      return isPreview
        ? Promise.resolve(previewTimelinePage(recordId, pageParams))
        : getMedicalRecordTimeline(recordId, pageParams);
    },
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });
}
