import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { env } from '@/config/env';
import { secureSession } from '@/shared/api/secure-session';

/**
 * Utilidades de descarga/apertura del PDF del Expediente Medico (A15/B15).
 *
 * No usa `httpClient` (shared/api/http-client.ts): `FileSystem.downloadAsync`
 * hace su propia request nativa para poder escribir la respuesta binaria
 * directo a disco, asi que el Bearer token se arma a mano aca en vez de
 * pasar por el interceptor de axios.
 */

/** Se lanza cuando no hay sesion activa o el dispositivo no puede compartir. */
export class MedicalRecordPdfUnavailableError extends Error {}

function targetPath(pacienteId: number): string {
  const dir = FileSystem.documentDirectory;

  if (!dir) {
    throw new MedicalRecordPdfUnavailableError(
      'Este dispositivo no tiene un directorio de documentos disponible.',
    );
  }

  return `${dir}expediente-medico-${pacienteId}.pdf`;
}

/**
 * Descarga el PDF del expediente del paciente activo y lo guarda en el
 * almacenamiento local de la app. Devuelve la ruta del archivo descargado.
 *
 * GET /patients/{paciente_id}/medical-record/pdf -- ver
 * Backend/.../api/v1/patient_documents.py.
 */
export async function downloadMedicalRecordPdf(pacienteId: number): Promise<string> {
  const session = await secureSession.get();

  if (!session) {
    throw new MedicalRecordPdfUnavailableError(
      'Tu sesion expiro. Inicia sesion de nuevo para descargar el expediente.',
    );
  }

  const result = await FileSystem.downloadAsync(
    `${env.apiV1Url}/patients/${pacienteId}/medical-record/pdf`,
    targetPath(pacienteId),
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  if (result.status !== 200) {
    throw new MedicalRecordPdfUnavailableError(
      'No pudimos descargar el expediente. Intenta de nuevo mas tarde.',
    );
  }

  return result.uri;
}

/**
 * Descarga (si hace falta) y abre el dialogo nativo de "compartir/abrir
 * con" para el PDF del expediente. Si el dispositivo no soporta compartir
 * (ej. algunos emuladores), lanza MedicalRecordPdfUnavailableError -- la
 * pantalla debe ocultar el boton de compartir cuando eso pase, ver
 * Sharing.isAvailableAsync().
 */
export async function shareMedicalRecordPdf(pacienteId: number): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new MedicalRecordPdfUnavailableError(
      'Este dispositivo no puede abrir o compartir archivos PDF.',
    );
  }

  const uri = await downloadMedicalRecordPdf(pacienteId);

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Expediente medico',
  });
}
