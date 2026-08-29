import { ApiError } from '@/src/shared/api/api-error';
import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from './medical-record-preview';
import type {
  Allergy,
  AllergyCreate,
  AllergyUpdate,
  CatalogItem,
  ClinicalListParams,
  Condition,
  ConditionCreate,
  ConditionHistory,
  ConditionUpdate,
  Disability,
  DisabilityCreate,
  DisabilityUpdate,
  MedicalHistoryCreate,
  MedicalHistoryEntry,
  MedicalHistoryUpdate,
  Page,
} from '../types/structured-history.types';

const baseSummary = previewMedicalRecordSummaries[101];

export const previewConditionStatuses: CatalogItem[] = [
  { id: 1, nombre: 'Activa', activo: true },
  { id: 2, nombre: 'Resuelta', activo: true },
  { id: 3, nombre: 'En observación', activo: true },
  { id: 4, nombre: 'Crónica', activo: true },
];

export const previewMedicalHistoryTypes: CatalogItem[] = [
  { id: 1, nombre: 'Personal', activo: true },
  { id: 2, nombre: 'Familiar', activo: true },
  { id: 3, nombre: 'Quirúrgico', activo: true },
  { id: 4, nombre: 'Alergológico', activo: true },
];

export const previewSeverityLevels: CatalogItem[] = [
  { id: 1, nombre: 'Baja' },
  { id: 2, nombre: 'Media' },
  { id: 3, nombre: 'Alta' },
  { id: 4, nombre: 'Crítica' },
];

export const previewConditionsByRecord: Record<number, Condition[]> = {
  7001: [...baseSummary.condiciones],
};

export const previewAllergiesByPatient: Record<number, Allergy[]> = {
  101: [...baseSummary.alergias],
};

export const previewDisabilitiesByPatient: Record<number, Disability[]> = {
  101: [...baseSummary.discapacidades],
};

export const previewMedicalHistoryByRecord: Record<number, MedicalHistoryEntry[]> = {
  7001: [...baseSummary.antecedentes],
};

export const previewConditionHistory: Record<number, ConditionHistory[]> = {
  3201: [
    {
      id: 9401,
      condicion_id: 3201,
      estado_anterior_id: null,
      estado_nuevo_id: 1,
      accion: 'CREADA',
      motivo: 'Registro inicial preview',
      usuario_id: 9001,
      created_at: '2024-04-02T08:00:00.000Z',
    },
  ],
};

const allowedTransitions: Record<string, Set<string>> = {
  Activa: new Set(['Resuelta', 'Crónica', 'En observación']),
  'En observación': new Set(['Activa', 'Resuelta', 'Crónica']),
  Crónica: new Set(['Activa', 'Resuelta', 'En observación']),
  Resuelta: new Set(),
};

let nextConditionId = 9500;
let nextConditionHistoryId = 9600;
let nextAllergyId = 9700;
let nextDisabilityId = 9800;
let nextMedicalHistoryId = 9900;

function conflict(message: string): never {
  throw new ApiError(message, 'conflict', 409);
}

function notFound(message: string): never {
  throw new ApiError(message, 'not_found', 404);
}

function pageFromItems<T>(items: T[], params: ClinicalListParams = {}): Page<T> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const filtered = items.filter(
    (item) =>
      params.activo === undefined ||
      !('activo' in (item as object)) ||
      (item as { activo?: boolean }).activo === params.activo,
  );
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

function findSummaryByRecord(recordId: number) {
  return Object.values(previewMedicalRecordSummaries).find(
    (summary) => summary.expediente?.id === recordId,
  );
}

function syncSummary(patientId: number, recordId: number) {
  const summary = previewMedicalRecordSummaries[patientId] ?? findSummaryByRecord(recordId);
  if (!summary) return;

  // React Query compara referencias al publicar el resultado de una refetch.
  // Si mutamos el mismo objeto que ya esta en cache, la pantalla de resumen
  // puede no renderizar de nuevo al volver desde una seccion estructurada.
  // Reemplazamos el summary completo para que los observers reciban una
  // referencia nueva, igual que ocurriria con una respuesta real de FastAPI.
  previewMedicalRecordSummaries[summary.paciente_id] = {
    ...summary,
    condiciones: (previewConditionsByRecord[recordId] ?? []).filter((item) => item.activo),
    alergias: (previewAllergiesByPatient[patientId] ?? []).filter((item) => item.activo),
    discapacidades: (previewDisabilitiesByPatient[patientId] ?? []).filter(
      (item) => item.activo,
    ),
    antecedentes: (previewMedicalHistoryByRecord[recordId] ?? []).filter(
      (item) => item.activo,
    ),
  };
}

function sortTimeline(recordId: number) {
  previewMedicalTimeline[recordId]?.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function syncConditionTimeline(recordId: number, condition: Condition, occurredAt?: string) {
  const historyIds = new Set(
    (previewConditionHistory[condition.id] ?? []).map((item) => String(item.id)),
  );
  const timeline = previewMedicalTimeline[recordId] ?? [];
  previewMedicalTimeline[recordId] = timeline.filter((event) => {
    if (event.entidad === 'condiciones_medicas' && event.entidad_id === String(condition.id)) {
      return false;
    }
    if (event.entidad === 'historial_condiciones' && historyIds.has(event.entidad_id)) {
      return false;
    }
    return true;
  });

  if (!condition.activo) return;

  previewMedicalTimeline[recordId].push({
    occurred_at: condition.fecha_inicio
      ? `${condition.fecha_inicio}T00:00:00.000Z`
      : occurredAt ?? new Date().toISOString(),
    tipo: 'condicion',
    titulo: condition.nombre,
    detalle: condition.descripcion,
    entidad: 'condiciones_medicas',
    entidad_id: String(condition.id),
  });
  previewMedicalTimeline[recordId].push(
    ...(previewConditionHistory[condition.id] ?? []).map((item) => ({
      occurred_at: item.created_at,
      tipo: 'historial_condicion',
      titulo: item.accion,
      detalle: item.motivo,
      entidad: 'historial_condiciones',
      entidad_id: String(item.id),
    })),
  );
  sortTimeline(recordId);
}

function syncMedicalHistoryTimeline(recordId: number, entry: MedicalHistoryEntry) {
  const timeline = previewMedicalTimeline[recordId] ?? [];
  previewMedicalTimeline[recordId] = timeline.filter(
    (event) =>
      !(event.entidad === 'antecedentes_medicos' && event.entidad_id === String(entry.id)),
  );
  if (entry.activo && entry.fecha) {
    previewMedicalTimeline[recordId].push({
      occurred_at: `${entry.fecha}T00:00:00.000Z`,
      tipo: 'antecedente',
      titulo: 'Antecedente médico',
      detalle: entry.descripcion,
      entidad: 'antecedentes_medicos',
      entidad_id: String(entry.id),
    });
    sortTimeline(recordId);
  }
}

function assertUniqueName<T extends { id: number; nombre: string }>(
  items: T[],
  nombre: string,
  currentId: number | undefined,
  label: string,
) {
  if (items.some((item) => item.nombre === nombre && item.id !== currentId)) {
    conflict(`${label} ya existe`);
  }
}

function assertCatalog(items: CatalogItem[], itemId: number | null | undefined, label: string) {
  if (itemId === null || itemId === undefined) return;
  if (!items.some((item) => item.id === itemId)) notFound(`${label} no existe`);
}

function statusName(statusId: number) {
  return previewConditionStatuses.find((item) => item.id === statusId)?.nombre;
}

function validateTransition(previousId: number, nextId: number) {
  if (previousId === nextId) return;
  const previous = statusName(previousId);
  const next = statusName(nextId);
  if (!previous || !next) notFound('Estado de condición no existe');
  const allowed = allowedTransitions[previous];
  if (allowed && !allowed.has(next)) {
    conflict(`No se puede cambiar una condición de ${previous} a ${next}`);
  }
}

export function listPreviewConditions(
  recordId: number,
  params: ClinicalListParams = {},
): Page<Condition> {
  return pageFromItems(previewConditionsByRecord[recordId] ?? [], params);
}

export function getPreviewCondition(recordId: number, conditionId: number): Condition | null {
  return (previewConditionsByRecord[recordId] ?? []).find((item) => item.id === conditionId) ?? null;
}

export function createPreviewCondition(
  recordId: number,
  patientId: number,
  data: ConditionCreate,
): Condition {
  const items = previewConditionsByRecord[recordId] ?? [];
  assertUniqueName(items, data.nombre, undefined, 'La condición médica');
  if (!statusName(data.estado_condicion_id)) notFound('Estado de condición no existe');

  nextConditionId += 1;
  nextConditionHistoryId += 1;
  const now = new Date().toISOString();
  const created: Condition = {
    id: nextConditionId,
    expediente_id: recordId,
    paciente_id: patientId,
    diagnostico_id: data.diagnostico_id ?? null,
    estado_condicion_id: data.estado_condicion_id,
    nombre: data.nombre,
    descripcion: data.descripcion ?? null,
    fecha_inicio: data.fecha_inicio ?? null,
    fecha_fin: null,
    activo: data.activo ?? true,
  };
  previewConditionsByRecord[recordId] = [created, ...items];
  previewConditionHistory[created.id] = [
    {
      id: nextConditionHistoryId,
      condicion_id: created.id,
      estado_anterior_id: null,
      estado_nuevo_id: created.estado_condicion_id,
      accion: 'CREADA',
      motivo: data.motivo_historial ?? null,
      usuario_id: 9001,
      created_at: now,
    },
  ];
  syncSummary(patientId, recordId);
  syncConditionTimeline(recordId, created, now);
  return created;
}

export function updatePreviewCondition(
  recordId: number,
  conditionId: number,
  data: ConditionUpdate,
): Condition {
  const items = previewConditionsByRecord[recordId] ?? [];
  const index = items.findIndex((item) => item.id === conditionId);
  if (index < 0) notFound('Condición médica no encontrada');
  const current = items[index];
  const normalized = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => key !== 'motivo_historial' && value !== null && value !== undefined,
    ),
  ) as Partial<Condition>;
  const nextName = normalized.nombre ?? current.nombre;
  assertUniqueName(items, nextName, conditionId, 'La condición médica');
  const nextStatus = normalized.estado_condicion_id ?? current.estado_condicion_id;
  validateTransition(current.estado_condicion_id, nextStatus);

  const updated: Condition = { ...current, ...normalized };
  items[index] = updated;
  if (nextStatus !== current.estado_condicion_id) {
    nextConditionHistoryId += 1;
    previewConditionHistory[conditionId] = [
      ...(previewConditionHistory[conditionId] ?? []),
      {
        id: nextConditionHistoryId,
        condicion_id: conditionId,
        estado_anterior_id: current.estado_condicion_id,
        estado_nuevo_id: nextStatus,
        accion: 'CAMBIO_ESTADO',
        motivo: data.motivo_historial ?? null,
        usuario_id: 9001,
        created_at: new Date().toISOString(),
      },
    ];
  }
  syncSummary(updated.paciente_id, recordId);
  syncConditionTimeline(recordId, updated);
  return updated;
}

export function deletePreviewCondition(recordId: number, conditionId: number): void {
  const items = previewConditionsByRecord[recordId] ?? [];
  const item = items.find((candidate) => candidate.id === conditionId);
  if (!item) notFound('Condición médica no encontrada');
  nextConditionHistoryId += 1;
  previewConditionHistory[conditionId] = [
    ...(previewConditionHistory[conditionId] ?? []),
    {
      id: nextConditionHistoryId,
      condicion_id: conditionId,
      estado_anterior_id: item.estado_condicion_id,
      estado_nuevo_id: item.estado_condicion_id,
      accion: 'BORRADO_LOGICO',
      motivo: 'Borrado lógico',
      usuario_id: 9001,
      created_at: new Date().toISOString(),
    },
  ];
  previewConditionsByRecord[recordId] = items.filter((candidate) => candidate.id !== conditionId);
  syncSummary(item.paciente_id, recordId);
  syncConditionTimeline(recordId, { ...item, activo: false });
}

export function listPreviewConditionHistory(
  recordId: number,
  conditionId: number,
  params: Pick<ClinicalListParams, 'limit' | 'offset'> = {},
): Page<ConditionHistory> {
  if (!getPreviewCondition(recordId, conditionId)) notFound('Condición médica no encontrada');
  return pageFromItems(previewConditionHistory[conditionId] ?? [], params);
}

export function listPreviewAllergies(
  patientId: number,
  params: ClinicalListParams = {},
): Page<Allergy> {
  return pageFromItems(previewAllergiesByPatient[patientId] ?? [], params);
}

export function getPreviewAllergy(patientId: number, allergyId: number): Allergy {
  const item = (previewAllergiesByPatient[patientId] ?? []).find(
    (candidate) => candidate.id === allergyId,
  );
  if (!item) notFound('Alergia no encontrada');
  return item;
}

export function createPreviewAllergy(
  patientId: number,
  recordId: number,
  data: AllergyCreate,
): Allergy {
  const items = previewAllergiesByPatient[patientId] ?? [];
  assertUniqueName(items, data.nombre, undefined, 'Alergia');
  assertCatalog(previewSeverityLevels, data.nivel_severidad_id, 'Nivel de severidad');
  assertCatalog(previewConditionStatuses, data.estado_condicion_id, 'Estado de condición');
  nextAllergyId += 1;
  const created: Allergy = {
    id: nextAllergyId,
    paciente_id: patientId,
    nombre: data.nombre,
    nivel_severidad_id: data.nivel_severidad_id ?? null,
    estado_condicion_id: data.estado_condicion_id ?? null,
    observaciones: data.observaciones ?? null,
    activo: data.activo ?? true,
  };
  previewAllergiesByPatient[patientId] = [created, ...items];
  syncSummary(patientId, recordId);
  return created;
}

export function updatePreviewAllergy(
  patientId: number,
  recordId: number,
  allergyId: number,
  data: AllergyUpdate,
): Allergy {
  const items = previewAllergiesByPatient[patientId] ?? [];
  const index = items.findIndex((item) => item.id === allergyId);
  if (index < 0) notFound('Alergia no encontrada');
  const current = items[index];
  const nextName = data.nombre ?? current.nombre;
  assertUniqueName(items, nextName, allergyId, 'Alergia');
  assertCatalog(previewSeverityLevels, data.nivel_severidad_id, 'Nivel de severidad');
  assertCatalog(previewConditionStatuses, data.estado_condicion_id, 'Estado de condición');
  const updated: Allergy = {
    ...current,
    ...data,
    nombre: nextName,
    nivel_severidad_id:
      data.nivel_severidad_id === undefined
        ? current.nivel_severidad_id
        : data.nivel_severidad_id,
    estado_condicion_id:
      data.estado_condicion_id === undefined
        ? current.estado_condicion_id
        : data.estado_condicion_id,
    observaciones:
      data.observaciones === undefined ? current.observaciones : data.observaciones,
    activo: data.activo ?? current.activo,
  };
  items[index] = updated;
  syncSummary(patientId, recordId);
  return updated;
}

export function deletePreviewAllergy(patientId: number, recordId: number, allergyId: number): void {
  getPreviewAllergy(patientId, allergyId);
  previewAllergiesByPatient[patientId] = (previewAllergiesByPatient[patientId] ?? []).filter(
    (item) => item.id !== allergyId,
  );
  syncSummary(patientId, recordId);
}

export function listPreviewDisabilities(
  patientId: number,
  params: ClinicalListParams = {},
): Page<Disability> {
  return pageFromItems(previewDisabilitiesByPatient[patientId] ?? [], params);
}

export function getPreviewDisability(patientId: number, disabilityId: number): Disability {
  const item = (previewDisabilitiesByPatient[patientId] ?? []).find(
    (candidate) => candidate.id === disabilityId,
  );
  if (!item) notFound('Discapacidad no encontrada');
  return item;
}

export function createPreviewDisability(
  patientId: number,
  recordId: number,
  data: DisabilityCreate,
): Disability {
  const items = previewDisabilitiesByPatient[patientId] ?? [];
  assertUniqueName(items, data.nombre, undefined, 'Discapacidad');
  assertCatalog(previewConditionStatuses, data.estado_condicion_id, 'Estado de condición');
  nextDisabilityId += 1;
  const created: Disability = {
    id: nextDisabilityId,
    paciente_id: patientId,
    nombre: data.nombre,
    estado_condicion_id: data.estado_condicion_id ?? null,
    observaciones: data.observaciones ?? null,
    activo: data.activo ?? true,
  };
  previewDisabilitiesByPatient[patientId] = [created, ...items];
  syncSummary(patientId, recordId);
  return created;
}

export function updatePreviewDisability(
  patientId: number,
  recordId: number,
  disabilityId: number,
  data: DisabilityUpdate,
): Disability {
  const items = previewDisabilitiesByPatient[patientId] ?? [];
  const index = items.findIndex((item) => item.id === disabilityId);
  if (index < 0) notFound('Discapacidad no encontrada');
  const current = items[index];
  const nextName = data.nombre ?? current.nombre;
  assertUniqueName(items, nextName, disabilityId, 'Discapacidad');
  assertCatalog(previewConditionStatuses, data.estado_condicion_id, 'Estado de condición');
  const updated: Disability = {
    ...current,
    ...data,
    nombre: nextName,
    estado_condicion_id:
      data.estado_condicion_id === undefined
        ? current.estado_condicion_id
        : data.estado_condicion_id,
    observaciones:
      data.observaciones === undefined ? current.observaciones : data.observaciones,
    activo: data.activo ?? current.activo,
  };
  items[index] = updated;
  syncSummary(patientId, recordId);
  return updated;
}

export function deletePreviewDisability(
  patientId: number,
  recordId: number,
  disabilityId: number,
): void {
  getPreviewDisability(patientId, disabilityId);
  previewDisabilitiesByPatient[patientId] = (
    previewDisabilitiesByPatient[patientId] ?? []
  ).filter((item) => item.id !== disabilityId);
  syncSummary(patientId, recordId);
}

export function listPreviewMedicalHistory(
  recordId: number,
  params: ClinicalListParams = {},
): Page<MedicalHistoryEntry> {
  return pageFromItems(previewMedicalHistoryByRecord[recordId] ?? [], params);
}

export function getPreviewMedicalHistoryEntry(
  recordId: number,
  historyId: number,
): MedicalHistoryEntry {
  const item = (previewMedicalHistoryByRecord[recordId] ?? []).find(
    (candidate) => candidate.id === historyId,
  );
  if (!item) notFound('Antecedente médico no encontrado');
  return item;
}

export function createPreviewMedicalHistoryEntry(
  patientId: number,
  recordId: number,
  data: MedicalHistoryCreate,
): MedicalHistoryEntry {
  const items = previewMedicalHistoryByRecord[recordId] ?? [];
  assertCatalog(previewMedicalHistoryTypes, data.tipo_antecedente_id, 'Tipo de antecedente');
  if (
    items.some(
      (item) =>
        item.tipo_antecedente_id === data.tipo_antecedente_id &&
        item.descripcion === data.descripcion,
    )
  ) {
    conflict('El antecedente médico ya existe');
  }
  nextMedicalHistoryId += 1;
  const created: MedicalHistoryEntry = {
    id: nextMedicalHistoryId,
    expediente_id: recordId,
    tipo_antecedente_id: data.tipo_antecedente_id,
    descripcion: data.descripcion,
    fecha: data.fecha ?? null,
    activo: data.activo ?? true,
  };
  previewMedicalHistoryByRecord[recordId] = [created, ...items];
  syncSummary(patientId, recordId);
  syncMedicalHistoryTimeline(recordId, created);
  return created;
}

export function updatePreviewMedicalHistoryEntry(
  patientId: number,
  recordId: number,
  historyId: number,
  data: MedicalHistoryUpdate,
): MedicalHistoryEntry {
  const items = previewMedicalHistoryByRecord[recordId] ?? [];
  const index = items.findIndex((item) => item.id === historyId);
  if (index < 0) notFound('Antecedente médico no encontrado');
  const current = items[index];
  assertCatalog(previewMedicalHistoryTypes, data.tipo_antecedente_id, 'Tipo de antecedente');
  const nextType = data.tipo_antecedente_id ?? current.tipo_antecedente_id;
  const nextDescription = data.descripcion ?? current.descripcion;
  if (
    items.some(
      (item) =>
        item.id !== historyId &&
        item.tipo_antecedente_id === nextType &&
        item.descripcion === nextDescription,
    )
  ) {
    conflict('El antecedente médico ya existe');
  }
  const updated: MedicalHistoryEntry = {
    ...current,
    tipo_antecedente_id: nextType,
    descripcion: nextDescription,
    fecha: data.fecha === undefined ? current.fecha : data.fecha,
    activo: data.activo ?? current.activo,
  };
  items[index] = updated;
  syncSummary(patientId, recordId);
  syncMedicalHistoryTimeline(recordId, updated);
  return updated;
}

export function deletePreviewMedicalHistoryEntry(
  patientId: number,
  recordId: number,
  historyId: number,
): void {
  const item = getPreviewMedicalHistoryEntry(recordId, historyId);
  previewMedicalHistoryByRecord[recordId] = (
    previewMedicalHistoryByRecord[recordId] ?? []
  ).filter((candidate) => candidate.id !== historyId);
  syncSummary(patientId, recordId);
  syncMedicalHistoryTimeline(recordId, { ...item, activo: false });
}
