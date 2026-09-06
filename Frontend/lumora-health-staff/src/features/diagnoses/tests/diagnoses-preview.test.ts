import { previewMedicalRecordSummaries } from '@/src/features/medical-records/preview/medical-record-preview';
import {
  createPreviewDiagnosis,
  deletePreviewDiagnosis,
  listPreviewDiagnoses,
  updatePreviewDiagnosis,
} from '../preview/diagnoses-preview';

describe('diagnoses preview J13', () => {
  it('keeps list and record summary synchronized in the same preview runtime', () => {
    const previousSummary = previewMedicalRecordSummaries[101];
    const created = createPreviewDiagnosis(101, 3401, {
      tipo_diagnostico_id: 2,
      descripcion: 'Diabetes mellitus tipo 2',
      es_principal: false,
      fecha_diagnostico: '2026-08-29',
    });

    expect(listPreviewDiagnoses(101, 3401).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
    expect(previewMedicalRecordSummaries[101]).not.toBe(previousSummary);
    expect(
      previewMedicalRecordSummaries[101].consultas[0].diagnosticos,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ descripcion: 'Diabetes mellitus tipo 2' }),
      ]),
    );

    updatePreviewDiagnosis(101, 3401, created.id, { activo: false });
    expect(
      previewMedicalRecordSummaries[101].consultas[0].diagnosticos.some(
        (item) => item.id === created.id,
      ),
    ).toBe(false);

    deletePreviewDiagnosis(101, 3401, created.id);
    expect(
      listPreviewDiagnoses(101, 3401).items.some((item) => item.id === created.id),
    ).toBe(false);
  });
});
