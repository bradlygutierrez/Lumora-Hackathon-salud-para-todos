import { httpClient } from '@/shared/api/http-client';

import type { MedicalRecordDocument } from '@/features/medical-record/types/medical-record.types';

/**
 * Servicio HTTP del Expediente Medico documental (A15/B15).
 *
 * Todas las requests pasan por `httpClient`, que ya agrega el Bearer token
 * y maneja el refresh de sesion (ver shared/api/http-client.ts). La
 * descarga del PDF binario NO pasa por aca -- ver
 * features/medical-record/utils/medical-record-pdf.ts, que arma su propia
 * request autenticada porque expo-file-system necesita hacer el streaming
 * de la respuesta a disco directamente.
 */
export class MedicalRecordApiService {
  /**
   * GET /patients/{paciente_id}/medical-record
   *
   * Documento clinico exportable -- misma fuente de datos que el resumen
   * clinico (A11), mas metadata de generacion (generado_en, autor). Ver
   * Backend/.../api/v1/patient_documents.py.
   */
  public getDocument(pacienteId: number): Promise<MedicalRecordDocument> {
    return httpClient.get(`/patients/${pacienteId}/medical-record`);
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const medicalRecordApi = new MedicalRecordApiService();
