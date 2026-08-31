import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  createClinicalNote,
  createConsultation,
  createVitalSigns,
  getConsultation,
  listClinicalNotes,
  listConsultations,
  listConsultationReasons,
  listRecordConsultations,
  listVitalSigns,
  updateClinicalNote,
  updateConsultation,
} from '../api/consultations.api';
import {
  createPreviewClinicalNote,
  createPreviewConsultation,
  createPreviewVitalSigns,
  previewClinicalNotesByConsultation,
  previewConsultationReasons,
  previewConsultationsByRecord,
  previewVitalSignsByConsultation,
  updatePreviewClinicalNote,
  updatePreviewConsultation,
} from '../preview/consultations-preview';
import type {
  ClinicalNoteCreate,
  ClinicalNoteListParams,
  ClinicalNoteUpdate,
  Consultation,
  ConsultationCreate,
  ConsultationListParams,
  ConsultationReasonListParams,
  ConsultationUpdate,
  Page,
  RecordConsultationListParams,
  VitalSignsCreate,
  VitalSignsListParams,
} from '../types/consultation.types';


export async function invalidateClinicalViews(
  queryClient: QueryClient,
  consultation: Consultation,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.patientSummary(consultation.paciente_id),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.medicalRecordDocument(consultation.paciente_id),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(consultation.paciente_id),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.clinical.medicalRecordTimeline(consultation.expediente_id),
    }),
  ]);
}

function cachedConsultation(queryClient: QueryClient, consultationId: number) {
  return queryClient.getQueryData<Consultation>(
    queryKeys.clinical.consultations.detail(consultationId),
  );
}

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


export function useCreateConsultation() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsultationCreate) =>
      session?.isPreview
        ? Promise.resolve(
            createPreviewConsultation({
              ...data,
              fecha_consulta: data.fecha_consulta,
              motivo_consulta_id: data.motivo_consulta_id ?? null,
              motivo: data.motivo ?? null,
              sintomas: data.sintomas ?? null,
              evaluacion: data.evaluacion ?? null,
              indicaciones: data.indicaciones ?? null,
              observaciones: data.observaciones ?? null,
              activo: data.activo ?? true,
            }),
          )
        : createConsultation(data),
    onSuccess: async (consultation) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clinical.consultations.all(),
      });
      queryClient.setQueryData(
        queryKeys.clinical.consultations.detail(consultation.id),
        consultation,
      );
      await invalidateClinicalViews(queryClient, consultation);
    },
  });
}

export function useUpdateConsultation(consultationId: number) {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsultationUpdate) =>
      session?.isPreview
        ? Promise.resolve(updatePreviewConsultation(consultationId, data))
        : updateConsultation(consultationId, data),
    onSuccess: async (consultation) => {
      queryClient.setQueryData(
        queryKeys.clinical.consultations.detail(consultationId),
        consultation,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clinical.consultations.all(),
      });
      await invalidateClinicalViews(queryClient, consultation);
    },
  });
}


export function useCreateVitalSigns(consultationId: number) {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VitalSignsCreate) =>
      session?.isPreview
        ? Promise.resolve(
            createPreviewVitalSigns(consultationId, {
              temperatura_c: data.temperatura_c ?? null,
              frecuencia_cardiaca: data.frecuencia_cardiaca ?? null,
              frecuencia_respiratoria: data.frecuencia_respiratoria ?? null,
              presion_sistolica: data.presion_sistolica ?? null,
              presion_diastolica: data.presion_diastolica ?? null,
              saturacion_oxigeno: data.saturacion_oxigeno ?? null,
              peso_kg: data.peso_kg ?? null,
              talla_cm: data.talla_cm ?? null,
              glucosa_mg_dl: data.glucosa_mg_dl ?? null,
              registrado_at: data.registrado_at,
            }),
          )
        : createVitalSigns(consultationId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.clinical.consultations.detail(consultationId), 'vital-signs'],
      });
      const consultation = cachedConsultation(queryClient, consultationId);
      if (consultation) await invalidateClinicalViews(queryClient, consultation);
    },
  });
}

export function useCreateClinicalNote(consultationId: number) {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClinicalNoteCreate) =>
      session?.isPreview
        ? Promise.resolve(createPreviewClinicalNote(consultationId, session.user?.id ?? 9001, data))
        : createClinicalNote(consultationId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.clinical.consultations.detail(consultationId), 'notes'],
      });
      const consultation = cachedConsultation(queryClient, consultationId);
      if (consultation) await invalidateClinicalViews(queryClient, consultation);
    },
  });
}

export function useUpdateClinicalNote(consultationId: number, noteId: number) {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClinicalNoteUpdate) =>
      session?.isPreview
        ? Promise.resolve(updatePreviewClinicalNote(consultationId, noteId, data))
        : updateClinicalNote(consultationId, noteId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.clinical.consultations.detail(consultationId), 'notes'],
      });
      const consultation = cachedConsultation(queryClient, consultationId);
      if (consultation) await invalidateClinicalViews(queryClient, consultation);
    },
  });
}
