import type {
  ClinicalNote,
  Consultation,
  ConsultationUpdate,
  ConsultationReason,
  Page,
  VitalSigns,
} from '../types/consultation.types';

export const previewConsultationsByRecord: Record<number, Consultation[]> = {
  7001: [
    {
      id: 5001,
      expediente_id: 7001,
      paciente_id: 101,
      profesional_id: 101,
      motivo_consulta_id: 1,
      fecha_consulta: '2026-08-28T15:30:00.000Z',
      motivo: 'Control de seguimiento',
      sintomas: 'Sin síntomas agudos.',
      evaluacion: 'Evolución estable.',
      indicaciones: 'Continuar seguimiento habitual.',
      observaciones: null,
      activo: true,
    },
  ],
};

export const previewVitalSignsByConsultation: Record<number, VitalSigns[]> = {
  5001: [
    {
      id: 6001,
      consulta_id: 5001,
      temperatura_c: 36.7,
      frecuencia_cardiaca: 72,
      frecuencia_respiratoria: 16,
      presion_sistolica: 118,
      presion_diastolica: 76,
      saturacion_oxigeno: 98,
      peso_kg: 68.4,
      talla_cm: 165,
      glucosa_mg_dl: null,
      registrado_at: '2026-08-28T15:35:00.000Z',
    },
  ],
};

export const previewClinicalNotesByConsultation: Record<number, ClinicalNote[]> = {
  5001: [
    {
      id: 6101,
      consulta_id: 5001,
      autor_id: 9001,
      contenido: 'Paciente estable durante el control de seguimiento.',
      created_at: '2026-08-28T15:40:00.000Z',
      updated_at: '2026-08-28T15:40:00.000Z',
      activo: true,
    },
  ],
};

export const previewConsultationReasons: Page<ConsultationReason> = {
  items: [
    { id: 1, nombre: 'Control', activo: true },
    { id: 2, nombre: 'Seguimiento', activo: true },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

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
  const items = previewConsultationsByRecord[data.expediente_id] ?? [];
  previewConsultationsByRecord[data.expediente_id] = [created, ...items];
  return created;
}

export function updatePreviewConsultation(
  consultationId: number,
  changes: ConsultationUpdate,
): Consultation {
  for (const items of Object.values(previewConsultationsByRecord)) {
    const index = items.findIndex((item) => item.id === consultationId);
    if (index >= 0) {
      const normalized = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== null && value !== undefined),
      );
      items[index] = { ...items[index], ...normalized };
      return items[index];
    }
  }
  throw new Error('Consulta preview no encontrada');
}
