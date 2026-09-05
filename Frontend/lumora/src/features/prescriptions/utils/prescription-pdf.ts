import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { env } from '@/config/env';
import { secureSession } from '@/shared/api/secure-session';

/**
 * Utilidades de descarga/apertura del PDF de una receta (B15).
 *
 * Mismo patrón que features/medical-record/utils/medical-record-pdf.ts:
 * `FileSystem.downloadAsync` hace su propia request nativa para escribir
 * la respuesta binaria directo a disco, así que el Bearer token se arma
 * a mano acá en vez de pasar por el interceptor de axios.
 */

/** Se lanza cuando no hay sesion activa o el dispositivo no puede compartir. */
export class PrescriptionPdfUnavailableError extends Error {}

function targetPath(recetaId: string): string {
  const dir = FileSystem.documentDirectory;

  if (!dir) {
    throw new PrescriptionPdfUnavailableError(
      'Este dispositivo no tiene un directorio de documentos disponible.',
    );
  }

  return `${dir}receta-${recetaId}.pdf`;
}

/**
 * Descarga el PDF de la receta y lo guarda en el almacenamiento local de
 * la app. Devuelve la ruta del archivo descargado.
 *
 * GET /prescriptions/{receta_id}/pdf -- ver Backend/.../api/v1/prescriptions.py.
 */
export async function downloadPrescriptionPdf(recetaId: string): Promise<string> {
  const session = await secureSession.get();

  if (!session) {
    throw new PrescriptionPdfUnavailableError(
      'Tu sesion expiro. Inicia sesion de nuevo para descargar la receta.',
    );
  }

  const result = await FileSystem.downloadAsync(
    `${env.apiV1Url}/prescriptions/${recetaId}/pdf`,
    targetPath(recetaId),
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (result.status !== 200) {
    throw new PrescriptionPdfUnavailableError(
      'No pudimos descargar la receta. Intenta de nuevo mas tarde.',
    );
  }

  return result.uri;
}

/**
 * Descarga (si hace falta) y abre el dialogo nativo de "compartir/abrir
 * con" para el PDF de la receta. Si el dispositivo no soporta compartir
 * (ej. algunos emuladores), lanza PrescriptionPdfUnavailableError.
 */
export async function sharePrescriptionPdf(recetaId: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new PrescriptionPdfUnavailableError(
      'Este dispositivo no puede abrir o compartir archivos PDF.',
    );
  }

  const uri = await downloadPrescriptionPdf(recetaId);

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Receta médica',
  });
}
