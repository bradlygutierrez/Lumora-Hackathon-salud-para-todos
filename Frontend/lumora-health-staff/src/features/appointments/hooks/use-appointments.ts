import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import {
  createMySchedule,
  deleteMySchedule,
  getMyAvailability,
  listMyAgenda,
  listMySchedules,
  updateMySchedule,
} from '../api/appointments.api';
import type { ProfessionalSchedulePayload } from '../types/appointment.types';

const workspaceKey = ['clinical', 'professional-workspace'] as const;

export function useProfessionalAgenda() {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: [...workspaceKey, 'agenda'],
    queryFn: () => (session?.isPreview ? Promise.resolve([]) : listMyAgenda()),
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
