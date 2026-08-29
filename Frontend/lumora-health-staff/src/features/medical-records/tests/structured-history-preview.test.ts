import { ApiError } from '@/src/shared/api/api-error';
import { previewMedicalRecordSummaries, previewMedicalTimeline } from '../preview/medical-record-preview';
import {
  createPreviewAllergy,
  createPreviewCondition,
  createPreviewDisability,
  createPreviewMedicalHistoryEntry,
  deletePreviewCondition,
  updatePreviewCondition,
} from '../preview/structured-history-preview';

describe('J12 structured history preview integration', () => {
  it('syncs condition create/state history with summary and timeline and enforces J04 transitions', () => {
    const condition = createPreviewCondition(7001, 101, {
      nombre: 'Condición preview J12',
      estado_condicion_id: 1,
      fecha_inicio: '2026-08-29',
      motivo_historial: 'Registro de prueba',
    });

    expect(previewMedicalRecordSummaries[101].condiciones).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: condition.id })]),
    );
    expect(previewMedicalTimeline[7001]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'condicion', entidad_id: String(condition.id) }),
        expect.objectContaining({ tipo: 'historial_condicion' }),
      ]),
    );

    const resolved = updatePreviewCondition(7001, condition.id, {
      estado_condicion_id: 2,
      motivo_historial: 'Condición resuelta',
    });
    expect(resolved.estado_condicion_id).toBe(2);

    expect(() =>
      updatePreviewCondition(7001, condition.id, {
        estado_condicion_id: 1,
        motivo_historial: 'Intento inválido',
      }),
    ).toThrow(ApiError);

    try {
      updatePreviewCondition(7001, condition.id, { estado_condicion_id: 1 });
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({ code: 'conflict', status: 409 }));
    }
  });

  it('mirrors duplicate conflicts for patient clinical records', () => {
    expect(() =>
      createPreviewAllergy(101, 7001, {
        nombre: 'Penicilina',
        nivel_severidad_id: 3,
      }),
    ).toThrow(ApiError);
  });

  it('rejects preview catalog ids that FastAPI would reject with 404', () => {
    expect(() =>
      createPreviewAllergy(101, 7001, {
        nombre: 'Alergia catálogo inválido',
        nivel_severidad_id: 999,
      }),
    ).toThrow(ApiError);
    expect(() =>
      createPreviewDisability(101, 7001, {
        nombre: 'Discapacidad catálogo inválido',
        estado_condicion_id: 999,
      }),
    ).toThrow(ApiError);
    expect(() =>
      createPreviewMedicalHistoryEntry(101, 7001, {
        tipo_antecedente_id: 999,
        descripcion: 'Tipo inválido',
      }),
    ).toThrow(ApiError);
  });

  it('syncs dated medical history with summary and timeline', () => {
    const entry = createPreviewMedicalHistoryEntry(101, 7001, {
      tipo_antecedente_id: 1,
      descripcion: 'Antecedente preview J12',
      fecha: '2026-08-28',
    });

    expect(previewMedicalRecordSummaries[101].antecedentes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: entry.id })]),
    );
    expect(previewMedicalTimeline[7001]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'antecedente', entidad_id: String(entry.id) }),
      ]),
    );
  });

  it('does not fabricate allergy/disability timeline events missing from backend J05', () => {
    const before = previewMedicalTimeline[7001].length;
    createPreviewAllergy(101, 7001, { nombre: 'Alergia preview J12' });
    createPreviewDisability(101, 7001, { nombre: 'Discapacidad preview J12' });

    expect(previewMedicalTimeline[7001]).toHaveLength(before);
    expect(previewMedicalRecordSummaries[101].alergias).toEqual(
      expect.arrayContaining([expect.objectContaining({ nombre: 'Alergia preview J12' })]),
    );
    expect(previewMedicalRecordSummaries[101].discapacidades).toEqual(
      expect.arrayContaining([expect.objectContaining({ nombre: 'Discapacidad preview J12' })]),
    );
  });

  it('publishes a new preview summary reference so record counters rerender', () => {
    const previousSummary = previewMedicalRecordSummaries[101];
    const condition = createPreviewCondition(7001, 101, {
      nombre: 'Condición refresco resumen J12',
      estado_condicion_id: 1,
    });

    expect(previewMedicalRecordSummaries[101]).not.toBe(previousSummary);
    expect(previewMedicalRecordSummaries[101].condiciones).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: condition.id })]),
    );
  });

  it('removes a soft-deleted condition from summary and timeline', () => {
    const condition = createPreviewCondition(7001, 101, {
      nombre: 'Condición borrado preview J12',
      estado_condicion_id: 1,
    });
    deletePreviewCondition(7001, condition.id);

    expect(previewMedicalRecordSummaries[101].condiciones).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: condition.id })]),
    );
    expect(previewMedicalTimeline[7001]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entidad: 'condiciones_medicas', entidad_id: String(condition.id) }),
      ]),
    );
  });
});
