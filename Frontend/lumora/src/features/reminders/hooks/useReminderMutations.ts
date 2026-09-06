import { useMutation, useQueryClient } from '@tanstack/react-query';

import { remindersApi } from '@/features/reminders/api/reminders-api';
import { useReminderTypeCatalog } from '@/features/reminders/hooks/useReminderTypeCatalog';
import type { RecordatorioCreate } from '@/features/reminders/types/reminders.types';
import { useShellContext } from '@/features/shell/hooks/useShellContext';
import { patientQueryKeys } from '@/features/shell/query/patient-query-keys';

type CreateSeguimientoInput = {
  titulo: string;
  mensaje: string;
  /** ISO de la próxima vez que aplica (hoy a esa hora). */
  fechaProgramada: string;
  objetivoCantidad: number | null;
  unidad: string | null;
  /** "Con meta y progreso": horas del día a repartir (ej. 08:00, 12:00). Vacío en Rutina simple. */
  horas?: string[];
};

/** POST /recordatorios con tipo "Seguimiento" -- el "+ Añadir Nuevo Recordatorio" del Figma. */
export function useCreateSeguimientoReminder() {
  const queryClient = useQueryClient();
  const { activePatient } = useShellContext();
  const tipoCatalog = useReminderTypeCatalog();
  const seguimientoTipoId = tipoCatalog.idByName('Seguimiento');

  return useMutation({
    mutationFn: (input: CreateSeguimientoInput) => {
      if (activePatient?.patientId === undefined) {
        throw new Error('No existe patientContext activo.');
      }
      if (seguimientoTipoId === undefined) {
        throw new Error(
          'No se pudo cargar el catálogo de tipos de recordatorio. Intenta de nuevo.',
        );
      }

      const data: RecordatorioCreate = {
        paciente_id: activePatient.patientId,
        tipo_recordatorio_id: seguimientoTipoId,
        titulo: input.titulo,
        mensaje: input.mensaje,
        fecha_programada: input.fechaProgramada,
        objetivo_cantidad: input.objetivoCantidad,
        progreso_actual: input.objetivoCantidad !== null ? 0 : null,
        unidad: input.unidad,
        horarios: input.horas?.map((hora) => ({ hora })) ?? [],
      };

      return remindersApi.createReminder(data);
    },
    onSuccess: () => {
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.reminders(activePatient.patientId),
        });
      }
    },
  });
}

/** PATCH /recordatorios/{id} -- suma avance a un recordatorio de seguimiento con objetivo/progreso. */
export function useUpdateReminderProgress() {
  const queryClient = useQueryClient();
  const { activePatient } = useShellContext();

  return useMutation({
    mutationFn: ({ id, progresoActual }: { id: number; progresoActual: number }) =>
      remindersApi.updateReminder(id, { progreso_actual: progresoActual }),
    onSuccess: () => {
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.reminders(activePatient.patientId),
        });
      }
    },
  });
}

/** PATCH /recordatorios/{id} con activo=false -- "hecho" para seguimiento sin objetivo/progreso (ej. Vitamina D). */
export function useMarkReminderDone() {
  const queryClient = useQueryClient();
  const { activePatient } = useShellContext();

  return useMutation({
    mutationFn: (id: number) => remindersApi.updateReminder(id, { activo: false }),
    onSuccess: () => {
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.reminders(activePatient.patientId),
        });
      }
    },
  });
}

type UpdateSeguimientoInput = {
  id: number;
  titulo: string;
  mensaje: string;
  /** ISO de la nueva hora en que aplica (hoy a esa hora). */
  fechaProgramada: string;
  objetivoCantidad: number | null;
  unidad: string | null;
  /** "Con meta y progreso": horas del día a repartir. Manda [] para Rutina
   * simple -- REEMPLAZA por completo las horas que ya tenía el recordatorio. */
  horas: string[];
};

/**
 * PATCH /recordatorios/{id} -- edición completa de un recordatorio de
 * "Seguimiento" (botón "Editar" del tablero, misma pantalla de "Nuevo
 * Recordatorio" pero precargada). No se usa para dosis/citas.
 */
export function useUpdateSeguimientoReminder() {
  const queryClient = useQueryClient();
  const { activePatient } = useShellContext();

  return useMutation({
    // Ojo: no se toca progreso_actual acá -- editar título/hora/objetivo
    // no debe reiniciar el avance que ya llevaba (eso solo lo hace "+
    // Agregar avance", ver useUpdateReminderProgress).
    mutationFn: ({ id, titulo, mensaje, fechaProgramada, objetivoCantidad, unidad, horas }: UpdateSeguimientoInput) =>
      remindersApi.updateReminder(id, {
        titulo,
        mensaje,
        fecha_programada: fechaProgramada,
        objetivo_cantidad: objetivoCantidad,
        unidad,
        horarios: horas.map((hora) => ({ hora })),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['reminder', variables.id] });
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.reminders(activePatient.patientId),
        });
      }
    },
  });
}

/**
 * DELETE /recordatorios/{id} -- solo para recordatorios de "Seguimiento"
 * (los que se crean desde "+ Añadir Nuevo Recordatorio"). Las dosis y citas
 * no se eliminan desde acá porque no se crean acá -- vienen del plan de
 * medicación (A07) y de las citas (A04).
 */
export function useDeleteReminder() {
  const queryClient = useQueryClient();
  const { activePatient } = useShellContext();

  return useMutation({
    mutationFn: (id: number) => remindersApi.deleteReminder(id),
    onSuccess: () => {
      if (activePatient?.patientId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: patientQueryKeys.reminders(activePatient.patientId),
        });
      }
    },
  });
}
