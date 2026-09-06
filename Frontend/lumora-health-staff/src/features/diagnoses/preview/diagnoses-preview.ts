import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from '@/src/features/medical-records/preview/medical-record-preview';
import type {
  Diagnosis,
  DiagnosisCreate,
  DiagnosisListParams,
  DiagnosisTypeCatalogItem,
  DiagnosisUpdate,
  Page,
} from '../types/diagnosis.types';

export const previewDiagnosisTypes: DiagnosisTypeCatalogItem[] = [
  { id: 1, nombre: 'Presuntivo', activo: true },
  { id: 2, nombre: 'Confirmado', activo: true },
  { id: 3, nombre: 'Diferencial', activo: true },
];

const diagnosesByConsultation = new Map<number, Diagnosis[]>();
let nextDiagnosisId = 9000;

function seedConsultation(patientId: number, consultationId: number) {
  if (diagnosesByConsultation.has(consultationId)) return;
  const consultation = previewMedicalRecordSummaries[patientId]?.consultas.find(
    (item) => item.consulta.id === consultationId,
  );
  diagnosesByConsultation.set(
    consultationId,
    consultation?.diagnosticos.map((item) => ({ ...item })) ?? [],
  );
}

function diagnosisList(patientId: number, consultationId: number) {
  seedConsultation(patientId, consultationId);
  return diagnosesByConsultation.get(consultationId) ?? [];
}

function syncSummary(patientId: number, consultationId: number) {
  const summary = previewMedicalRecordSummaries[patientId];
  if (!summary) return;
  const current = diagnosisList(patientId, consultationId).filter((item) => item.activo);
  previewMedicalRecordSummaries[patientId] = {
    ...summary,
    consultas: summary.consultas.map((item) =>
      item.consulta.id === consultationId
        ? { ...item, diagnosticos: current.map((diagnosis) => ({ ...diagnosis })) }
        : item,
    ),
  };
}

function syncTimeline(recordId: number, diagnosis: Diagnosis | null, diagnosisId: number) {
  const current = previewMedicalTimeline[recordId] ?? [];
  const withoutDiagnosis = current.filter(
    (item) => !(item.tipo === 'diagnostico' && item.entidad_id === String(diagnosisId)),
  );
  if (!diagnosis || !diagnosis.activo) {
    previewMedicalTimeline[recordId] = withoutDiagnosis;
    return;
  }
  previewMedicalTimeline[recordId] = [
    ...withoutDiagnosis,
    {
      occurred_at: `${diagnosis.fecha_diagnostico}T00:00:00.000Z`,
      tipo: 'diagnostico',
      titulo: diagnosis.es_principal ? 'Diagnóstico principal' : 'Diagnóstico',
      detalle: diagnosis.descripcion,
      entidad: 'diagnosticos',
      entidad_id: String(diagnosis.id),
    },
  ].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function consultationContext(patientId: number, consultationId: number) {
  const summary = previewMedicalRecordSummaries[patientId];
  const consultation = summary?.consultas.find(
    (item) => item.consulta.id === consultationId,
  )?.consulta;
  if (!summary?.expediente || !consultation) {
    throw new Error('Consulta preview no encontrada');
  }
  return { recordId: summary.expediente.id, professionalId: consultation.profesional_id };
}

export function listPreviewDiagnoses(
  patientId: number,
  consultationId: number,
  params: DiagnosisListParams = {},
): Page<Diagnosis> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const items = diagnosisList(patientId, consultationId);
  return {
    items: items.slice(offset, offset + limit).map((item) => ({ ...item })),
    total: items.length,
    limit,
    offset,
  };
}

export function getPreviewDiagnosis(
  patientId: number,
  consultationId: number,
  diagnosisId: number,
): Diagnosis {
  const item = diagnosisList(patientId, consultationId).find(
    (diagnosis) => diagnosis.id === diagnosisId,
  );
  if (!item) throw new Error('Diagnóstico preview no encontrado');
  return { ...item };
}

export function createPreviewDiagnosis(
  patientId: number,
  consultationId: number,
  data: DiagnosisCreate,
): Diagnosis {
  const { recordId, professionalId } = consultationContext(patientId, consultationId);
  const item: Diagnosis = {
    id: ++nextDiagnosisId,
    consulta_id: consultationId,
    expediente_id: recordId,
    profesional_id: professionalId,
    tipo_diagnostico_id: data.tipo_diagnostico_id,
    descripcion: data.descripcion,
    es_principal: data.es_principal ?? false,
    fecha_diagnostico:
      data.fecha_diagnostico ?? new Date().toISOString().slice(0, 10),
    activo: data.activo ?? true,
  };
  const items = diagnosisList(patientId, consultationId);
  diagnosesByConsultation.set(consultationId, [...items, item]);
  syncSummary(patientId, consultationId);
  syncTimeline(recordId, item, item.id);
  return { ...item };
}

export function updatePreviewDiagnosis(
  patientId: number,
  consultationId: number,
  diagnosisId: number,
  data: DiagnosisUpdate,
): Diagnosis {
  const { recordId } = consultationContext(patientId, consultationId);
  const items = diagnosisList(patientId, consultationId);
  const current = items.find((item) => item.id === diagnosisId);
  if (!current) throw new Error('Diagnóstico preview no encontrado');
  const updated: Diagnosis = { ...current, ...data };
  diagnosesByConsultation.set(
    consultationId,
    items.map((item) => (item.id === diagnosisId ? updated : item)),
  );
  syncSummary(patientId, consultationId);
  syncTimeline(recordId, updated, diagnosisId);
  return { ...updated };
}

export function deletePreviewDiagnosis(
  patientId: number,
  consultationId: number,
  diagnosisId: number,
) {
  const { recordId } = consultationContext(patientId, consultationId);
  const items = diagnosisList(patientId, consultationId);
  if (!items.some((item) => item.id === diagnosisId)) {
    throw new Error('Diagnóstico preview no encontrado');
  }
  diagnosesByConsultation.set(
    consultationId,
    items.filter((item) => item.id !== diagnosisId),
  );
  syncSummary(patientId, consultationId);
  syncTimeline(recordId, null, diagnosisId);
}
