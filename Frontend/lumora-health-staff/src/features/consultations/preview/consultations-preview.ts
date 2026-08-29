import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from '@/src/features/medical-records/preview/medical-record-preview';
import type {
  ClinicalNote,
  Consultation,
  ConsultationReason,
  ConsultationUpdate,
  Page,
  VitalSigns,
} from '../types/consultation.types';

const baseSummary = previewMedicalRecordSummaries[101];

export const previewConsultationsByRecord: Record<number, Consultation[]> = {
  7001: baseSummary.consultas.map((item) => item.consulta),
};

export const previewVitalSignsByConsultation: Record<number, VitalSigns[]> = Object.fromEntries(
  baseSummary.consultas.map((item) => [item.consulta.id, item.signos_vitales]),
);

export const previewClinicalNotesByConsultation: Record<number, ClinicalNote[]> = Object.fromEntries(
  baseSummary.consultas.map((item) => [item.consulta.id, item.notas]),
);

export const previewConsultationReasons: Page<ConsultationReason> = {
  items: [
    { id: 1, nombre: 'Control', activo: true },
    { id: 2, nombre: 'Seguimiento', activo: true },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

function sortPreviewTimeline(recordId: number) {
  previewMedicalTimeline[recordId]?.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function findSummaryBundle(consultationId: number) {
  for (const summary of Object.values(previewMedicalRecordSummaries)) {
    const bundle = summary.consultas.find((item) => item.consulta.id === consultationId);
    if (bundle) return { summary, bundle };
  }
  return null;
}

function ensureSummaryBundle(consultation: Consultation) {
  const summary = previewMedicalRecordSummaries[consultation.paciente_id];
  if (!summary) return null;
  let bundle = summary.consultas.find((item) => item.consulta.id === consultation.id);
  if (!bundle) {
    bundle = {
      consulta: consultation,
      signos_vitales: previewVitalSignsByConsultation[consultation.id] ?? [],
      notas: (previewClinicalNotesByConsultation[consultation.id] ?? []).filter((note) => note.activo),
      diagnosticos: [],
    };
    summary.consultas.unshift(bundle);
  }
  return { summary, bundle };
}

let nextConsultationId = 9000;

export function createPreviewConsultation(
  data: Omit<Consultation, 'id' | 'fecha_consulta'> & { fecha_consulta?: string | null },
): Consultation {
  nextConsultationId += 1;
  const created: Consultation = {
    ...data,
    id: nextConsultationId,
    fecha_consulta: data.fecha_consulta || new Date().toISOString(),
  };
  previewConsultationsByRecord[data.expediente_id] = [
    created,
    ...(previewConsultationsByRecord[data.expediente_id] ?? []),
  ];
  previewVitalSignsByConsultation[created.id] = [];
  previewClinicalNotesByConsultation[created.id] = [];
  if (created.activo) {
    ensureSummaryBundle(created);
    previewMedicalTimeline[data.expediente_id] = [
      ...(previewMedicalTimeline[data.expediente_id] ?? []),
      {
        occurred_at: created.fecha_consulta,
        tipo: 'consulta',
        titulo: created.motivo || 'Consulta médica',
        detalle: created.evaluacion,
        entidad: 'consultas_medicas',
        entidad_id: String(created.id),
      },
    ];
    sortPreviewTimeline(data.expediente_id);
  }
  return created;
}

export function updatePreviewConsultation(
  consultationId: number,
  changes: ConsultationUpdate,
): Consultation {
  for (const [recordKey, items] of Object.entries(previewConsultationsByRecord)) {
    const index = items.findIndex((item) => item.id === consultationId);
    if (index < 0) continue;

    const normalized = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== null && value !== undefined),
    );
    items[index] = { ...items[index], ...normalized };
    const updated = items[index];
    const recordId = Number(recordKey);
    const summary = previewMedicalRecordSummaries[updated.paciente_id];
    if (summary) {
      summary.consultas = summary.consultas.filter((entry) => entry.consulta.id !== consultationId);
      if (updated.activo) ensureSummaryBundle(updated);
    }

    const vitalSignIds = new Set(
      (previewVitalSignsByConsultation[consultationId] ?? []).map((item) => String(item.id)),
    );
    const noteIds = new Set(
      (previewClinicalNotesByConsultation[consultationId] ?? []).map((item) => String(item.id)),
    );
    const timeline = previewMedicalTimeline[recordId] ?? [];
    previewMedicalTimeline[recordId] = timeline.filter((event) => {
      if (event.tipo === 'consulta' && event.entidad_id === String(consultationId)) return false;
      if (event.tipo === 'signos_vitales' && vitalSignIds.has(event.entidad_id)) return false;
      if (event.tipo === 'nota' && noteIds.has(event.entidad_id)) return false;
      return true;
    });
    if (updated.activo) {
      previewMedicalTimeline[recordId].push({
        occurred_at: updated.fecha_consulta,
        tipo: 'consulta',
        titulo: updated.motivo || 'Consulta médica',
        detalle: updated.evaluacion,
        entidad: 'consultas_medicas',
        entidad_id: String(updated.id),
      });
      previewMedicalTimeline[recordId].push(
        ...(previewVitalSignsByConsultation[consultationId] ?? []).map((item) => ({
          occurred_at: item.registrado_at,
          tipo: 'signos_vitales',
          titulo: 'Signos vitales registrados',
          detalle: null,
          entidad: 'signos_vitales',
          entidad_id: String(item.id),
        })),
        ...(previewClinicalNotesByConsultation[consultationId] ?? [])
          .filter((item) => item.activo)
          .map((item) => ({
            occurred_at: item.created_at,
            tipo: 'nota',
            titulo: 'Nota clínica',
            detalle: item.contenido,
            entidad: 'notas_clinicas',
            entidad_id: String(item.id),
          })),
      );
      sortPreviewTimeline(recordId);
    }
    return updated;
  }
  throw new Error('Consulta preview no encontrada');
}

let nextVitalSignsId = 9200;
let nextClinicalNoteId = 9300;

export function createPreviewVitalSigns(
  consultationId: number,
  data: Omit<VitalSigns, 'id' | 'consulta_id' | 'registrado_at'> & { registrado_at?: string | null },
): VitalSigns {
  nextVitalSignsId += 1;
  const created: VitalSigns = {
    ...data,
    id: nextVitalSignsId,
    consulta_id: consultationId,
    registrado_at: data.registrado_at || new Date().toISOString(),
  };
  previewVitalSignsByConsultation[consultationId] = [
    created,
    ...(previewVitalSignsByConsultation[consultationId] ?? []),
  ];
  const match = findSummaryBundle(consultationId);
  if (match) {
    match.bundle.signos_vitales = previewVitalSignsByConsultation[consultationId];
    const recordId = match.bundle.consulta.expediente_id;
    previewMedicalTimeline[recordId] = [
      ...(previewMedicalTimeline[recordId] ?? []),
      {
        occurred_at: created.registrado_at,
        tipo: 'signos_vitales',
        titulo: 'Signos vitales registrados',
        detalle: null,
        entidad: 'signos_vitales',
        entidad_id: String(created.id),
      },
    ];
    sortPreviewTimeline(recordId);
  }
  return created;
}

export function createPreviewClinicalNote(
  consultationId: number,
  authorId: number,
  data: { contenido: string; activo?: boolean },
): ClinicalNote {
  nextClinicalNoteId += 1;
  const now = new Date().toISOString();
  const created: ClinicalNote = {
    id: nextClinicalNoteId,
    consulta_id: consultationId,
    autor_id: authorId,
    contenido: data.contenido,
    created_at: now,
    updated_at: now,
    activo: data.activo ?? true,
  };
  previewClinicalNotesByConsultation[consultationId] = [
    created,
    ...(previewClinicalNotesByConsultation[consultationId] ?? []),
  ];
  const match = findSummaryBundle(consultationId);
  if (match && created.activo) {
    match.bundle.notas = previewClinicalNotesByConsultation[consultationId].filter((note) => note.activo);
    const recordId = match.bundle.consulta.expediente_id;
    previewMedicalTimeline[recordId] = [
      ...(previewMedicalTimeline[recordId] ?? []),
      {
        occurred_at: created.created_at,
        tipo: 'nota',
        titulo: 'Nota clínica',
        detalle: created.contenido,
        entidad: 'notas_clinicas',
        entidad_id: String(created.id),
      },
    ];
    sortPreviewTimeline(recordId);
  }
  return created;
}

export function updatePreviewClinicalNote(
  consultationId: number,
  noteId: number,
  data: { contenido?: string | null; activo?: boolean | null },
): ClinicalNote {
  const items = previewClinicalNotesByConsultation[consultationId] ?? [];
  const index = items.findIndex((item) => item.id === noteId);
  if (index < 0) throw new Error('Nota clínica preview no encontrada');
  const changes = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
  );
  items[index] = { ...items[index], ...changes, updated_at: new Date().toISOString() };
  const updated = items[index];
  const match = findSummaryBundle(consultationId);
  if (match) {
    match.bundle.notas = items.filter((note) => note.activo);
    const recordId = match.bundle.consulta.expediente_id;
    const timeline = previewMedicalTimeline[recordId] ?? [];
    previewMedicalTimeline[recordId] = timeline.filter(
      (event) => !(event.tipo === 'nota' && event.entidad_id === String(noteId)),
    );
    if (updated.activo) {
      previewMedicalTimeline[recordId].push({
        occurred_at: updated.created_at,
        tipo: 'nota',
        titulo: 'Nota clínica',
        detalle: updated.contenido,
        entidad: 'notas_clinicas',
        entidad_id: String(updated.id),
      });
      sortPreviewTimeline(recordId);
    }
  }
  return updated;
}
