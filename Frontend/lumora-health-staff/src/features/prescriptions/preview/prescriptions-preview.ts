import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from '@/src/features/medical-records/preview/medical-record-preview';
import { previewProfessionalsPage } from '@/src/shared/preview/health-staff-preview';
import type {
  Medication,
  Prescription,
  PrescriptionCatalogItem,
  PrescriptionCreate,
  PrescriptionDetail,
  PrescriptionDetailCreate,
  PrescriptionDetailUpdate,
  PrescriptionUpdate,
} from '../types/prescription.types';

export const previewPrescriptionStatuses: PrescriptionCatalogItem[] = [
  { id: 1, nombre: 'Activa' },
  { id: 2, nombre: 'Completada' },
  { id: 3, nombre: 'Suspendida' },
  { id: 4, nombre: 'Vencida' },
];

export const previewAdministrationRoutes: PrescriptionCatalogItem[] = [
  { id: 1, nombre: 'Oral' },
  { id: 2, nombre: 'Intravenosa' },
  { id: 3, nombre: 'Intramuscular' },
  { id: 4, nombre: 'Tópica' },
  { id: 5, nombre: 'Subcutánea' },
];

export const previewMeasurementUnits: PrescriptionCatalogItem[] = [
  { id: 1, nombre: 'mg' },
  { id: 2, nombre: 'g' },
  { id: 3, nombre: 'ml' },
  { id: 6, nombre: 'Tableta' },
  { id: 7, nombre: 'Cápsula' },
];

export const previewMedications: Medication[] = [
  {
    id: 'med-preview-losartan',
    nombre: 'Losartán',
    nombre_generico: 'Losartán potásico',
    presentacion: 'Tableta',
    concentracion: '50 mg',
    fabricante: 'Preview',
    activo: true,
    created_at: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'med-preview-metformin',
    nombre: 'Metformina',
    nombre_generico: 'Metformina',
    presentacion: 'Tableta',
    concentracion: '500 mg',
    fabricante: 'Preview',
    activo: true,
    created_at: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'med-preview-atorvastatin',
    nombre: 'Atorvastatina',
    nombre_generico: 'Atorvastatina',
    presentacion: 'Tableta',
    concentracion: '20 mg',
    fabricante: 'Preview',
    activo: true,
    created_at: '2026-08-20T12:00:00.000Z',
  },
];

const prescriptionsByPatient = new Map<number, Prescription[]>();
let prescriptionSequence = 200;
let detailSequence = 500;

function professionalFor(id: number) {
  const professional = previewProfessionalsPage.items.find((item) => item.id === id);
  if (!professional) throw new Error('Profesional preview no encontrado');
  return professional;
}

function seedPatient(patientId: number) {
  if (prescriptionsByPatient.has(patientId)) return;
  const summary = previewMedicalRecordSummaries[patientId];
  const seeded =
    summary?.recetas.map((item) => ({
      id: item.id,
      paciente_id: patientId,
      profesional_id: item.profesional_id,
      consulta_id: item.consulta_id,
      estado_id: item.estado_id,
      titulo: item.titulo,
      fecha_emision: item.fecha_emision,
      vigencia_hasta: item.vigencia_hasta,
      observaciones: null,
      created_at: item.fecha_emision,
      detalles:
        item.id === 'rx-preview-101'
          ? [
              {
                id: 'detail-preview-losartan',
                receta_id: item.id,
                medicamento_id: 'med-preview-losartan',
                unidad_medida_id: 1,
                via_administracion_id: 1,
                dosis: '50 mg',
                frecuencia: 'Cada 12 horas',
                duracion_dias: 30,
                cantidad_total: 60,
                instrucciones: 'Tomar con agua.',
              },
            ]
          : [],
      profesional: professionalFor(item.profesional_id),
    })) ?? [];
  prescriptionsByPatient.set(patientId, seeded);
}

function recipes(patientId: number) {
  seedPatient(patientId);
  return prescriptionsByPatient.get(patientId) ?? [];
}

function clonePrescription(item: Prescription): Prescription {
  return {
    ...item,
    detalles: item.detalles.map((detail) => ({ ...detail })),
    profesional: { ...item.profesional, persona: { ...item.profesional.persona } },
  };
}

function syncSummary(patientId: number) {
  const summary = previewMedicalRecordSummaries[patientId];
  if (!summary) return;
  previewMedicalRecordSummaries[patientId] = {
    ...summary,
    recetas: recipes(patientId).map((item) => ({
      id: item.id,
      profesional_id: item.profesional_id,
      consulta_id: item.consulta_id,
      estado_id: item.estado_id,
      titulo: item.titulo,
      fecha_emision: item.fecha_emision,
      vigencia_hasta: item.vigencia_hasta,
    })),
  };
}

function syncTimeline(patientId: number, prescription: Prescription) {
  const recordId = previewMedicalRecordSummaries[patientId]?.expediente?.id;
  if (!recordId) return;
  const current = previewMedicalTimeline[recordId] ?? [];
  previewMedicalTimeline[recordId] = [
    ...current.filter(
      (item) => !(item.tipo === 'receta' && item.entidad_id === prescription.id),
    ),
    {
      occurred_at: prescription.fecha_emision,
      tipo: 'receta',
      titulo: prescription.titulo ?? 'Receta médica',
      detalle: prescription.observaciones,
      entidad: 'recetas',
      entidad_id: prescription.id,
    },
  ].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

export function listPreviewMedications(limit = 100, offset = 0) {
  return previewMedications.slice(offset, offset + limit).map((item) => ({ ...item }));
}

export function listPreviewPrescriptions(patientId: number): Prescription[] {
  return recipes(patientId).map(clonePrescription);
}

export function getPreviewPrescription(
  patientId: number,
  prescriptionId: string,
): Prescription {
  const item = recipes(patientId).find((recipe) => recipe.id === prescriptionId);
  if (!item) throw new Error('Receta preview no encontrada');
  return clonePrescription(item);
}

export function createPreviewPrescription(
  patientId: number,
  data: PrescriptionCreate,
): Prescription {
  if (data.paciente_id !== patientId) {
    throw new Error('El paciente de la receta no coincide con el contexto preview');
  }
  const professional = professionalFor(data.profesional_id);
  const id = `rx-preview-j13-${++prescriptionSequence}`;
  const now = new Date().toISOString();
  const prescription: Prescription = {
    id,
    paciente_id: patientId,
    profesional_id: professional.id,
    consulta_id: data.consulta_id ?? null,
    estado_id: data.estado_id,
    titulo: data.titulo ?? null,
    fecha_emision: now,
    vigencia_hasta: data.vigencia_hasta ?? null,
    observaciones: data.observaciones ?? null,
    created_at: now,
    detalles: data.detalles.map((detail) => ({
      ...detail,
      id: `detail-preview-j13-${++detailSequence}`,
      receta_id: id,
      instrucciones: detail.instrucciones ?? null,
    })),
    profesional: professional,
  };
  prescriptionsByPatient.set(patientId, [...recipes(patientId), prescription]);
  syncSummary(patientId);
  syncTimeline(patientId, prescription);
  return clonePrescription(prescription);
}

export function updatePreviewPrescription(
  patientId: number,
  prescriptionId: string,
  data: PrescriptionUpdate,
): Prescription {
  const items = recipes(patientId);
  const current = items.find((item) => item.id === prescriptionId);
  if (!current) throw new Error('Receta preview no encontrada');
  const updated: Prescription = { ...current, ...data };
  prescriptionsByPatient.set(
    patientId,
    items.map((item) => (item.id === prescriptionId ? updated : item)),
  );
  syncSummary(patientId);
  syncTimeline(patientId, updated);
  return clonePrescription(updated);
}

export function createPreviewPrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  data: PrescriptionDetailCreate,
): PrescriptionDetail {
  const items = recipes(patientId);
  const current = items.find((item) => item.id === prescriptionId);
  if (!current) throw new Error('Receta preview no encontrada');
  const detail: PrescriptionDetail = {
    ...data,
    id: `detail-preview-j13-${++detailSequence}`,
    receta_id: prescriptionId,
    instrucciones: data.instrucciones ?? null,
  };
  const updated = { ...current, detalles: [...current.detalles, detail] };
  prescriptionsByPatient.set(
    patientId,
    items.map((item) => (item.id === prescriptionId ? updated : item)),
  );
  return { ...detail };
}

export function updatePreviewPrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  detailId: string,
  data: PrescriptionDetailUpdate,
): PrescriptionDetail {
  const items = recipes(patientId);
  const current = items.find((item) => item.id === prescriptionId);
  const detail = current?.detalles.find((item) => item.id === detailId);
  if (!current || !detail) throw new Error('Detalle preview no encontrado');
  const updatedDetail: PrescriptionDetail = { ...detail, ...data };
  const updated = {
    ...current,
    detalles: current.detalles.map((item) =>
      item.id === detailId ? updatedDetail : item,
    ),
  };
  prescriptionsByPatient.set(
    patientId,
    items.map((item) => (item.id === prescriptionId ? updated : item)),
  );
  return { ...updatedDetail };
}

export function deletePreviewPrescriptionDetail(
  patientId: number,
  prescriptionId: string,
  detailId: string,
) {
  const items = recipes(patientId);
  const current = items.find((item) => item.id === prescriptionId);
  if (!current || !current.detalles.some((item) => item.id === detailId)) {
    throw new Error('Detalle preview no encontrado');
  }
  const updated = {
    ...current,
    detalles: current.detalles.filter((item) => item.id !== detailId),
  };
  prescriptionsByPatient.set(
    patientId,
    items.map((item) => (item.id === prescriptionId ? updated : item)),
  );
}
