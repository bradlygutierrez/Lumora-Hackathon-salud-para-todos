import { apiClient } from '@/src/shared/api/client';
import type {
  AppointmentDetail,
  AppointmentLocation,
  AppointmentLocationPayload,
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

export async function getAppointment(appointmentId: number): Promise<AppointmentDetail> {
  const response = await apiClient.get<AppointmentDetail>(`/citas/${appointmentId}`);
  return response.data;
}

export async function listPatientAppointments(
  patientId: number,
): Promise<AppointmentDetail[]> {
  const response = await apiClient.get<AppointmentDetail[]>('/citas', {
    params: { paciente_id: patientId },
  });
  return response.data;
}

export async function getMyLocation(): Promise<AppointmentLocation | null> {
  const response = await apiClient.get<AppointmentLocation | null>('/profesional/me/ubicacion');
  return response.data;
}

export async function setMyLocation(
  payload: AppointmentLocationPayload,
): Promise<AppointmentLocation> {
  const response = await apiClient.put<AppointmentLocation>('/profesional/me/ubicacion', payload);
  return response.data;
}

export async function deleteMyLocation(): Promise<void> {
  await apiClient.delete('/profesional/me/ubicacion');
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
