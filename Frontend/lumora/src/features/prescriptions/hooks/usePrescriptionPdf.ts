import { useMutation } from '@tanstack/react-query';

import {
  downloadPrescriptionPdf,
  sharePrescriptionPdf,
} from '@/features/prescriptions/utils/prescription-pdf';

/**
 * Descarga el PDF de la receta al almacenamiento local de la app, sin
 * abrir ningun dialogo. Util si en el futuro se agrega una vista propia
 * del archivo descargado.
 */
export function useDownloadPrescriptionPdf() {
  return useMutation({
    mutationFn: (recetaId: string) => downloadPrescriptionPdf(recetaId),
  });
}

/**
 * Descarga y abre el dialogo nativo de "compartir/abrir con" para el PDF
 * de la receta.
 */
export function useSharePrescriptionPdf() {
  return useMutation({
    mutationFn: (recetaId: string) => sharePrescriptionPdf(recetaId),
  });
}
