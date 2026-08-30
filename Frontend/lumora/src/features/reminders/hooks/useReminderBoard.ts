import { useTodayMedicationPlan } from '@/features/prescriptions/hooks/useTodayMedicationPlan';
import { TIME_OF_DAY_ORDER, todayAtHora } from '@/features/prescriptions/utils/time-of-day';
import { useSeguimientoReminders } from '@/features/reminders/hooks/useSeguimientoReminders';
import { useUpcomingAppointments } from '@/features/reminders/hooks/useUpcomingAppointments';
import type { ReminderBoardItem } from '@/features/reminders/types/reminders.types';
import { groupReminderBoard } from '@/features/reminders/utils/group-reminders';
import { computeReminderPriority } from '@/features/reminders/utils/priority';

/**
 * Arma el tablero de "Recordatorios" (A10) combinando 3 fuentes que ya
 * existen por separado -- no se inventa un endpoint nuevo que las una:
 *
 * - dosis pendientes de hoy (useTodayMedicationPlan, A07);
 * - citas próximas (useUpcomingAppointments, sobre homeHealthService);
 * - recordatorios de seguimiento (useSeguimientoReminders, A10).
 *
 * Cada una se convierte a `ReminderBoardItem` y se agrupa por cercanía
 * (ver utils/group-reminders.ts).
 */
export function useReminderBoard() {
  const medicationPlan = useTodayMedicationPlan();
  const appointments = useUpcomingAppointments();
  const seguimiento = useSeguimientoReminders();

  const now = new Date();

  const dosisItems: ReminderBoardItem[] = TIME_OF_DAY_ORDER.flatMap((bucket) =>
    medicationPlan.plan.sections[bucket]
      // A10: una dosis pospuesta debe seguir apareciendo en el tablero
      // (a su nueva hora), no desaparecer -- solo se quita cuando ya se
      // registro como tomada u omitida.
      .filter((item) => item.status === 'pendiente' || item.status === 'pospuesta')
      .map((item) => {
        const scheduledAt =
          item.status === 'pospuesta' && item.dosisHoyFechaProgramada
            ? new Date(item.dosisHoyFechaProgramada)
            : todayAtHora(item.hora);
        return {
          id: `dosis-${item.horarioId}`,
          kind: 'dosis' as const,
          scheduledAt,
          priority: computeReminderPriority(scheduledAt, now),
          title: item.medicamentoNombre,
          subtitle: `${item.dosis} · ${item.frecuencia}`,
          instructions: item.instrucciones,
          done: false,
          horarioId: item.horarioId,
          hora: item.hora,
        };
      }),
  );

  const citaItems: ReminderBoardItem[] = appointments.items.map((appointment) => {
    const scheduledAt = new Date(appointment.inicio);
    return {
      id: `cita-${appointment.id}`,
      kind: 'cita' as const,
      scheduledAt,
      priority: computeReminderPriority(scheduledAt, now),
      title: appointment.professional
        ? `Cita con ${appointment.professional.full_name}`
        : 'Cita médica',
      subtitle: appointment.professional?.specialty ?? '',
      instructions: appointment.notas,
      done: false,
    };
  });

  const seguimientoItems: ReminderBoardItem[] = seguimiento.items.flatMap((recordatorio) => {
    const base = {
      kind: 'seguimiento' as const,
      title: recordatorio.titulo,
      subtitle: recordatorio.mensaje,
      instructions: null,
      // Solo relevante para "Rutina simple" (sin objetivo) -- "Marcar
      // como hecho" pone activo=false pero YA NO desaparece del
      // tablero, se queda visible marcado como completado.
      done: !recordatorio.activo,
      recordatorioId: recordatorio.id,
      objetivoCantidad: recordatorio.objetivo_cantidad,
      progresoActual: recordatorio.progreso_actual,
      unidad: recordatorio.unidad,
    };

    // "Con meta y progreso" con varias horas del día (ej. Beber Agua a
    // las 08:00/12:00/16:00/20:00) -- una tarjeta por cada hora, todas
    // comparten el mismo objetivo/progreso (misma fila en la BD).
    if (recordatorio.horarios.length > 0) {
      return recordatorio.horarios.map((horario) => {
        const scheduledAt = todayAtHora(horario.hora);
        return {
          ...base,
          id: `seguimiento-${recordatorio.id}-${horario.id}`,
          scheduledAt,
          priority: computeReminderPriority(scheduledAt, now),
        };
      });
    }

    // Rutina simple (o un recordatorio viejo sin horas) -- una sola
    // tarjeta con `fecha_programada`.
    const scheduledAt = new Date(recordatorio.fecha_programada);
    return [
      {
        ...base,
        id: `seguimiento-${recordatorio.id}`,
        scheduledAt,
        priority: computeReminderPriority(scheduledAt, now),
      },
    ];
  });

  const board = groupReminderBoard(
    [...dosisItems, ...citaItems, ...seguimientoItems],
    now,
  );

  const isLoading =
    medicationPlan.isLoading || appointments.isLoading || seguimiento.isLoading;
  const isError = medicationPlan.isError || appointments.isError || seguimiento.isError;

  const refetch = () => {
    medicationPlan.refetch();
    void appointments.refetch();
    void seguimiento.refetch();
  };

  return { board, isLoading, isError, refetch };
}
