import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  createMySchedule,
  deleteMySchedule,
  getAppointment,
  getMyAvailability,
  listMyAgenda,
  listMySchedules,
  listPatientAppointments,
  updateMySchedule,
} from '../api/appointments.api';
import type { ProfessionalSchedulePayload } from '../types/appointment.types';
import { pickNextAppointment } from '../utils/next-appointment';

const workspaceKey = ['clinical', 'professional-workspace'] as const;

export function useProfessionalAgenda(range?: { desde: string; hasta: string }) {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: [...workspaceKey, 'agenda', range?.desde ?? null, range?.hasta ?? null],
    queryFn: () => (session?.isPreview ? Promise.resolve([]) : listMyAgenda(range)),
  });
}

export function useProfessionalSchedules() {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: [...workspaceKey, 'schedules'],
    queryFn: () => (session?.isPreview ? Promise.resolve([]) : listMySchedules()),
  });
}

export function useProfessionalAvailability(date: string, enabled = true) {
  const { session } = useAuthSession();
  return useQuery({
    enabled: enabled && /^\d{4}-\d{2}-\d{2}$/.test(date),
    queryKey: [...workspaceKey, 'availability', date],
    queryFn: () =>
      session?.isPreview
        ? Promise.resolve({ fecha: date, slots: [] })
        : getMyAvailability(date),
  });
}

export function useAppointment(appointmentId: number) {
  const { session } = useAuthSession();
  return useQuery({
    enabled: Number.isFinite(appointmentId) && appointmentId > 0,
    queryKey: [...workspaceKey, 'appointment', appointmentId],
    queryFn: () =>
      session?.isPreview
        ? Promise.reject(new Error('La vista previa no tiene citas reales'))
        : getAppointment(appointmentId),
  });
}

export function useNextPatientAppointment(patientId: number) {
  const { session } = useAuthSession();
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: [...workspaceKey, 'patient-appointments', patientId],
    queryFn: () =>
      session?.isPreview ? Promise.resolve([]) : listPatientAppointments(patientId),
    select: (items) => pickNextAppointment(items),
  });
}

export function useScheduleMutations() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: workspaceKey });
  };

  const create = useMutation({
    mutationFn: (payload: ProfessionalSchedulePayload) =>
      session?.isPreview
        ? Promise.reject(new Error('La vista previa no modifica horarios'))
        : createMySchedule(payload),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({
      scheduleId,
      payload,
    }: {
      scheduleId: number;
      payload: Partial<ProfessionalSchedulePayload>;
    }) =>
      session?.isPreview
        ? Promise.reject(new Error('La vista previa no modifica horarios'))
        : updateMySchedule(scheduleId, payload),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (scheduleId: number) =>
      session?.isPreview
        ? Promise.reject(new Error('La vista previa no modifica horarios'))
        : deleteMySchedule(scheduleId),
    onSuccess: refresh,
  });

  return { create, update, remove };
}
