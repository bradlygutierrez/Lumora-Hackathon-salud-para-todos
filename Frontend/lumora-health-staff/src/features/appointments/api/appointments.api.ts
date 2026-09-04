import { apiClient } from '@/src/shared/api/client';
import type {
  ProfessionalAgendaItem,
  ProfessionalAvailability,
  ProfessionalSchedule,
  ProfessionalSchedulePayload,
} from '../types/appointment.types';

export async function listMyAgenda(range?: {
  desde?: string;
  hasta?: string;
}): Promise<ProfessionalAgendaItem[]> {
  const response = await apiClient.get<ProfessionalAgendaItem[]>('/profesional/me/agenda', {
    params: range,
  });
  return response.data;
}

export async function listMySchedules(): Promise<ProfessionalSchedule[]> {
  const response = await apiClient.get<ProfessionalSchedule[]>('/profesional/me/horarios');
  return response.data;
}

export async function createMySchedule(
  payload: ProfessionalSchedulePayload,
): Promise<ProfessionalSchedule> {
  const response = await apiClient.post<ProfessionalSchedule>(
    '/profesional/me/horarios',
    payload,
  );
  return response.data;
}

export async function updateMySchedule(
  scheduleId: number,
  payload: Partial<ProfessionalSchedulePayload>,
): Promise<ProfessionalSchedule> {
  const response = await apiClient.patch<ProfessionalSchedule>(
    `/profesional/me/horarios/${scheduleId}`,
    payload,
  );
  return response.data;
}

export async function deleteMySchedule(scheduleId: number): Promise<void> {
  await apiClient.delete(`/profesional/me/horarios/${scheduleId}`);
}

export async function getMyAvailability(
  date: string,
): Promise<ProfessionalAvailability> {
  const response = await apiClient.get<ProfessionalAvailability>(
    '/profesional/me/disponibilidad',
    { params: { fecha: date } },
  );
  return response.data;
}
