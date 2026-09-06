import { Platform } from 'react-native';

import type { MedicalRecordPdfPayload } from '../types/medical-record-document.types';

function payloadArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function downloadWebPdf(payload: MedicalRecordPdfPayload) {
  const blob = new Blob([payloadArrayBuffer(payload.bytes)], {
    type: 'application/pdf',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function shareWebPdf(payload: MedicalRecordPdfPayload) {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }

  const file = new File(
    [payloadArrayBuffer(payload.bytes)],
    payload.filename,
    { type: 'application/pdf' },
  );
  const shareData = { files: [file], title: 'Expediente médico Lumora' };

  if (!navigator.canShare(shareData)) {
    return false;
  }

  await navigator.share(shareData);
  return true;
}

async function shareNativePdf(
  payload: MedicalRecordPdfPayload,
  dialogTitle: string,
) {
  const [{ File: ExpoFile, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
  ]);
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;

  const file = new ExpoFile(Paths.cache, payload.filename);
  file.write(payload.bytes);
  try {
    await Sharing.shareAsync(file.uri, {
      dialogTitle,
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } finally {
    try {
      file.delete();
    } catch {
      // El archivo vive solo en cache; si el sistema ya lo removió no queda nada por limpiar.
    }
  }
}

export async function downloadMedicalRecordPdf(
  payload: MedicalRecordPdfPayload,
): Promise<void> {
  if (Platform.OS === 'web') {
    downloadWebPdf(payload);
    return;
  }

  const opened = await shareNativePdf(
    payload,
    'Guardar o abrir expediente médico',
  );
  if (!opened) {
    throw new Error('No hay una aplicación disponible para guardar o abrir el PDF.');
  }
}

export async function shareMedicalRecordPdf(
  payload: MedicalRecordPdfPayload,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return shareWebPdf(payload);
  }

  return shareNativePdf(payload, 'Compartir expediente médico');
}
