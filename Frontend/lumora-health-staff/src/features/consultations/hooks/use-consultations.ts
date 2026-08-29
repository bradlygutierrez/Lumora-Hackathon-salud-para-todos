import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  getConsultation,
  listClinicalNotes,
  listConsultations,
  listConsultationReasons,
  listRecordConsultations,
  listVitalSigns,
} from '../api/consultations.api';
import {
  previewClinicalNotesByConsultation,
  previewConsultationReasons,
  previewConsultationsByRecord,
  previewVitalSignsByConsultation,
} from '../preview/consultations-preview';
import type {
  ClinicalNoteListParams,
  ConsultationListParams,
  ConsultationReasonListParams,
  Page,
  RecordConsultationListParams,
  VitalSignsListParams,
} from '../types/consultation.types';

function pageFromItems<T>(items: T[], limit: number, offset: number): Page<T> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}

export function useConsultations(params: ConsultationListParams = {}) {
  const { session } = useAuthSession();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    expediente_id: params.expediente_id,
    paciente_id: params.paciente_id,
    profesional_id: params.profesional_id,
    activo: params.activo,
    fecha_desde: params.fecha_desde,
    fecha_hasta: params.fecha_hasta,
  };

  return useQuery({
    queryKey: queryKeys.clinical.consultations.list(normalized),
    queryFn: () => {
      if (session?.isPreview) {
        const items = Object.values(previewConsultationsByRecord)
          .flat()
          .filter(
            (item) =>
              (normalized.expediente_id === undefined ||
                item.expediente_id === normalized.expediente_id) &&
              (normalized.paciente_id === undefined ||
                item.paciente_id === normalized.paciente_id) &&
              (normalized.profesional_id === undefined ||
                item.profesional_id === normalized.profesional_id) &&
              (normalized.activo === undefined || item.activo === normalized.activo) &&
              (normalized.fecha_desde === undefined ||
                item.fecha_consulta >= normalized.fecha_desde) &&
              (normalized.fecha_hasta === undefined ||
                item.fecha_consulta <= normalized.fecha_hasta),
          );
        return Promise.resolve(pageFromItems(items, normalized.limit, normalized.offset));
      }
      return listConsultations(normalized);
    },
  });
}

export function useRecordConsultations(
  recordId: number,
  params: RecordConsultationListParams = {},
) {
  const { session } = useAuthSession();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };

  return useQuery({
    enabled: Number.isFinite(recordId) && recordId > 0,
    queryKey: queryKeys.clinical.consultations.forRecord(recordId, normalized),
    queryFn: () => {
      if (session?.isPreview) {
        const items = (previewConsultationsByRecord[recordId] ?? []).filter(
          (item) => normalized.activo === undefined || item.activo === normalized.activo,
        );
        return Promise.resolve(pageFromItems(items, normalized.limit, normalized.offset));
      }
      return listRecordConsultations(recordId, normalized);
    },
  });
}

export function useConsultation(consultationId: number) {
  const { session } = useAuthSession();

  return useQuery({
    enabled: Number.isFinite(consultationId) && consultationId > 0,
    queryKey: queryKeys.clinical.consultations.detail(consultationId),
    queryFn: () => {
      if (session?.isPreview) {
        const consultation = Object.values(previewConsultationsByRecord)
          .flat()
          .find((item) => item.id === consultationId);
        return consultation
          ? Promise.resolve(consultation)
          : Promise.reject(new Error('Consulta preview no encontrada'));
      }
      return getConsultation(consultationId);
    },
  });
}

export function useVitalSigns(
  consultationId: number,
  params: VitalSignsListParams = {},
) {
  const { session } = useAuthSession();
  const normalized = { limit: params.limit ?? 20, offset: params.offset ?? 0 };

  return useQuery({
    enabled: Number.isFinite(consultationId) && consultationId > 0,
    queryKey: queryKeys.clinical.consultations.vitalSigns(consultationId, normalized),
    queryFn: () =>
      session?.isPreview
        ? Promise.resolve(
            pageFromItems(
              previewVitalSignsByConsultation[consultationId] ?? [],
              normalized.limit,
              normalized.offset,
            ),
          )
        : listVitalSigns(consultationId, normalized),
  });
}

export function useClinicalNotes(
  consultationId: number,
  params: ClinicalNoteListParams = {},
) {
  const { session } = useAuthSession();
  const normalized = {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    activo: params.activo,
  };

  return useQuery({
    enabled: Number.isFinite(consultationId) && consultationId > 0,
    queryKey: queryKeys.clinical.consultations.notes(consultationId, normalized),
    queryFn: () => {
      if (session?.isPreview) {
        const items = (previewClinicalNotesByConsultation[consultationId] ?? []).filter(
          (item) => normalized.activo === undefined || item.activo === normalized.activo,
        );
        return Promise.resolve(pageFromItems(items, normalized.limit, normalized.offset));
      }
      return listClinicalNotes(consultationId, normalized);
    },
  });
}

export function useConsultationReasons(params: ConsultationReasonListParams = {}) {
  const { session } = useAuthSession();
  const normalized = {
    limit: params.limit ?? 100,
    offset: params.offset ?? 0,
    activo: params.activo ?? true,
  };

  return useQuery({
    queryKey: queryKeys.clinical.consultations.reasons(normalized),
    queryFn: () => {
      if (session?.isPreview) {
        const filtered = previewConsultationReasons.items.filter(
          (item) => item.activo === normalized.activo,
        );
        return Promise.resolve(pageFromItems(filtered, normalized.limit, normalized.offset));
      }
      return listConsultationReasons(normalized);
    },
  });
}
