import { httpClient } from '@/shared/api/http-client';

import type {
  CatalogPage,
  RecordatorioCreate,
  RecordatorioResponse,
  RecordatorioUpdate,
} from '@/features/reminders/types/reminders.types';

/**
 * Servicio HTTP de Recordatorios (A10).
 *
 * Todas las requests pasan por `httpClient` (Bearer token + refresh de
 * sesión automáticos, ver shared/api/http-client.ts).
 */
export class RemindersApiService {
  /** GET /reminders/recordatorios/paciente/{paciente_id} */
  public getPatientReminders(pacienteId: number): Promise<RecordatorioResponse[]> {
    return httpClient.get(`/reminders/recordatorios/paciente/${pacienteId}`);
  }

  /** GET /reminders/recordatorios/{id} */
  public getReminder(id: number): Promise<RecordatorioResponse> {
    return httpClient.get(`/reminders/recordatorios/${id}`);
  }

  /** POST /reminders/recordatorios */
  public createReminder(data: RecordatorioCreate): Promise<RecordatorioResponse> {
    return httpClient.post('/reminders/recordatorios', data);
  }

  /** PATCH /reminders/recordatorios/{id} */
  public updateReminder(
    id: number,
    data: RecordatorioUpdate,
  ): Promise<RecordatorioResponse> {
    return httpClient.patch(`/reminders/recordatorios/${id}`, data);
  }

  /** GET /tipos-recordatorio */
  public getReminderTypes(): Promise<CatalogPage> {
    return httpClient.get('/tipos-recordatorio?limit=100');
  }

  /** DELETE /reminders/recordatorios/{id} */
  public deleteReminder(id: number): Promise<void> {
    return httpClient.delete(`/reminders/recordatorios/${id}`);
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const remindersApi = new RemindersApiService();
