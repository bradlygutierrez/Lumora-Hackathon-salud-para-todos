import { previewMedicalRecordSummaries } from '@/src/features/medical-records/preview/medical-record-preview';
import {
  createPreviewPrescription,
  createPreviewPrescriptionDetail,
  deletePreviewPrescriptionDetail,
  listPreviewPrescriptions,
  updatePreviewPrescription,
} from '../preview/prescriptions-preview';

describe('prescriptions preview J13', () => {
  it('synchronizes prescription list and medical record summary', () => {
    const before = previewMedicalRecordSummaries[101];
    const created = createPreviewPrescription(101, {
      paciente_id: 101,
      profesional_id: 101,
      estado_id: 1,
      titulo: 'Control diabetes',
      detalles: [
        {
          medicamento_id: 'med-preview-metformin',
          unidad_medida_id: 1,
          via_administracion_id: 1,
          dosis: '500 mg',
          frecuencia: 'Cada 12 horas',
          duracion_dias: 30,
          cantidad_total: 60,
        },
      ],
    });

    expect(previewMedicalRecordSummaries[101]).not.toBe(before);
    expect(listPreviewPrescriptions(101)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
    expect(previewMedicalRecordSummaries[101].recetas).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );

    updatePreviewPrescription(101, created.id, { estado_id: 2 });
    expect(
      previewMedicalRecordSummaries[101].recetas.find(
        (item) => item.id === created.id,
      )?.estado_id,
    ).toBe(2);

    const detail = createPreviewPrescriptionDetail(101, created.id, {
      medicamento_id: 'med-preview-atorvastatin',
      unidad_medida_id: 1,
      via_administracion_id: 1,
      dosis: '20 mg',
      frecuencia: 'Cada 24 horas',
      duracion_dias: 30,
      cantidad_total: 30,
    });
    expect(
      listPreviewPrescriptions(101).find((item) => item.id === created.id)
        ?.detalles,
    ).toHaveLength(2);

    deletePreviewPrescriptionDetail(101, created.id, detail.id);
    expect(
      listPreviewPrescriptions(101).find((item) => item.id === created.id)
        ?.detalles,
    ).toHaveLength(1);
  });
});
