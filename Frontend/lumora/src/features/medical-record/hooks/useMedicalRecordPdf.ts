import { useMutation } from '@tanstack/react-query';

import {
  downloadMedicalRecordPdf,
  shareMedicalRecordPdf,
} from '@/features/medical-record/utils/medical-record-pdf';

/**
 * Descarga el PDF del expediente al almacenamiento local de la app, sin
 * abrir ningun dialogo. Util si en el futuro se agrega una vista propia
 * del archivo descargado.
 */
export function useDownloadMedicalRecordPdf() {
  return useMutation({
    mutationFn: (pacienteId: number) => downloadMedicalRecordPdf(pacienteId),
  });
}

/**
 * Descarga y abre el dialogo nativo de "compartir/abrir con" para el PDF
 * del expediente del paciente activo.
 */
export function useShareMedicalRecordPdf() {
  return useMutation({
    mutationFn: (pacienteId: number) => shareMedicalRecordPdf(pacienteId),
  });
}
