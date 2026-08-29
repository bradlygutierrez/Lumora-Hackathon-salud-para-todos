import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  appointmentsApi,
} from '@/features/appointments/api/appointments-api';
import type {
  AppointmentCreateRequest,
  AppointmentRescheduleRequest,
} from '@/features/appointments/types/appointments.types';
import {
  invalidateAppointmentCaches,
} from '@/features/appointments/query/invalidate-appointments';

export function useAppointmentMutations(
  patientId: number | null,
) {
  const queryClient =
    useQueryClient();

  const requirePatient =
    (): number => {
      if (
        patientId ===
        null
      ) {
        throw new Error(
          'No existe un patientContext activo.',
        );
      }

      return patientId;
    };

  const invalidate =
    async () => {
      await invalidateAppointmentCaches(
        queryClient,
        requirePatient(),
      );
    };

  const create =
    useMutation({
      mutationFn: (
        data:
          AppointmentCreateRequest,
      ) => {
        requirePatient();

        return appointmentsApi
          .create(
            data,
          );
      },

      onSuccess:
        invalidate,
    });

  const reschedule =
    useMutation({
      mutationFn: ({
        appointmentId,
        data,
      }: {
        appointmentId: number;
        data: AppointmentRescheduleRequest;
      }) => {
        requirePatient();

        return appointmentsApi
          .reschedule(
            appointmentId,
            data,
          );
      },

      onSuccess:
        invalidate,
    });

  const cancel =
    useMutation({
      mutationFn: ({
        appointmentId,
        reason,
      }: {
        appointmentId: number;
        reason?: string | null;
      }) => {
        requirePatient();

        return appointmentsApi
          .cancel(
            appointmentId,
            reason,
          );
      },

      onSuccess:
        invalidate,
    });

  return {
    create,
    reschedule,
    cancel,
  };
}
