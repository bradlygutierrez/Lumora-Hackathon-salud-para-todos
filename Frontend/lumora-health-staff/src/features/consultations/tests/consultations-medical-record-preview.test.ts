import {
  previewMedicalRecordSummaries,
  previewMedicalTimeline,
} from '@/src/features/medical-records/preview/medical-record-preview';
import {
  createPreviewClinicalNote,
  createPreviewConsultation,
  createPreviewVitalSigns,
  previewConsultationsByRecord,
  updatePreviewConsultation,
} from '../preview/consultations-preview';

describe('J11 preview integration with J10', () => {
  it('starts from the same consultation objects used by the medical record summary', () => {
    expect(previewConsultationsByRecord[7001][0]).toBe(
      previewMedicalRecordSummaries[101].consultas[0].consulta,
    );
    expect(previewConsultationsByRecord[7001][0].id).toBe(3401);
  });

  it('propagates consultation, signs and notes into summary and timeline preview', () => {
    const consultation = createPreviewConsultation({
      expediente_id: 7001,
      paciente_id: 101,
      profesional_id: 101,
      motivo_consulta_id: 1,
      motivo: 'Consulta integrada J11',
      sintomas: null,
      evaluacion: 'Estable',
      indicaciones: null,
      observaciones: null,
      activo: true,
    });
    createPreviewVitalSigns(consultation.id, {
      temperatura_c: 36.8,
      frecuencia_cardiaca: 70,
      frecuencia_respiratoria: null,
      presion_sistolica: 120,
      presion_diastolica: 80,
      saturacion_oxigeno: 98,
      peso_kg: null,
      talla_cm: null,
      glucosa_mg_dl: null,
    });
    createPreviewClinicalNote(consultation.id, 9001, { contenido: 'Nota integrada J11' });

    const bundle = previewMedicalRecordSummaries[101].consultas.find(
      (item) => item.consulta.id === consultation.id,
    );
    expect(bundle?.signos_vitales).toHaveLength(1);
    expect(bundle?.notas[0]?.autor_id).toBe(9001);
    expect(previewMedicalTimeline[7001]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'consulta', entidad_id: String(consultation.id) }),
        expect.objectContaining({ tipo: 'signos_vitales' }),
        expect.objectContaining({ tipo: 'nota', detalle: 'Nota integrada J11' }),
      ]),
    );
  });

  it('removes and restores child clinical events when a preview consultation changes active state', () => {
    const consultation = createPreviewConsultation({
      expediente_id: 7001,
      paciente_id: 101,
      profesional_id: 101,
      motivo_consulta_id: 2,
      motivo: 'Consulta para estado preview',
      sintomas: null,
      evaluacion: null,
      indicaciones: null,
      observaciones: null,
      activo: true,
    });
    const vitalSigns = createPreviewVitalSigns(consultation.id, {
      temperatura_c: 37,
      frecuencia_cardiaca: null,
      frecuencia_respiratoria: null,
      presion_sistolica: null,
      presion_diastolica: null,
      saturacion_oxigeno: null,
      peso_kg: null,
      talla_cm: null,
      glucosa_mg_dl: null,
    });
    const note = createPreviewClinicalNote(consultation.id, 9001, {
      contenido: 'Nota para estado preview',
    });

    updatePreviewConsultation(consultation.id, { activo: false });

    expect(previewMedicalRecordSummaries[101].consultas).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ consulta: expect.objectContaining({ id: consultation.id }) })]),
    );
    expect(previewMedicalTimeline[7001]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entidad_id: String(consultation.id) }),
        expect.objectContaining({ entidad_id: String(vitalSigns.id) }),
        expect.objectContaining({ entidad_id: String(note.id) }),
      ]),
    );

    updatePreviewConsultation(consultation.id, { activo: true });

    expect(previewMedicalRecordSummaries[101].consultas).toEqual(
      expect.arrayContaining([expect.objectContaining({ consulta: expect.objectContaining({ id: consultation.id }) })]),
    );
    expect(previewMedicalTimeline[7001]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'consulta', entidad_id: String(consultation.id) }),
        expect.objectContaining({ tipo: 'signos_vitales', entidad_id: String(vitalSigns.id) }),
        expect.objectContaining({ tipo: 'nota', entidad_id: String(note.id) }),
      ]),
    );
  });

});
