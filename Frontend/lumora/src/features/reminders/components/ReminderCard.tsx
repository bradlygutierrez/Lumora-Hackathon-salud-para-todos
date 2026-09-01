import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { GoalCompleteBadge } from '@/features/reminders/components/GoalCompleteBadge';
import { PriorityBadge } from '@/features/reminders/components/PriorityBadge';
import { ProgressBar } from '@/features/reminders/components/ProgressBar';
import type { ReminderBoardItem } from '@/features/reminders/types/reminders.types';
import { formatItemTime } from '@/features/reminders/utils/format-time';
import { AppButton } from '@/shared/components/AppButton';
import { theme } from '@/shared/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function iconForItem(item: ReminderBoardItem): IconName {
  if (item.kind === 'dosis') return 'medkit-outline';
  if (item.kind === 'cita') return 'calendar-outline';
  // seguimiento: si tiene objetivo/progreso lo tratamos como
  // hidratación (agua), si no como una rutina simple (ej. Vitamina D).
  return item.objetivoCantidad != null ? 'water-outline' : 'nutrition-outline';
}

type ReminderCardProps = {
  item: ReminderBoardItem;

  /**
   * false para un cuidador con acceso de solo lectura -- oculta todas
   * las acciones de escritura (marcar, posponer, omitir, actualizar
   * avance, editar, eliminar). Por defecto true (paciente dueño, o
   * cuidador con acceso completo).
   */
  canManage?: boolean;

  onRegisterDose?: (item: ReminderBoardItem) => void;
  isRegistering?: boolean;
  onSkipDose?: (item: ReminderBoardItem) => void;
  isSkipping?: boolean;
  onPostponeDose?: (item: ReminderBoardItem) => void;
  isPostponing?: boolean;

  onAddProgress?: (item: ReminderBoardItem) => void;
  isAddingProgress?: boolean;
  onMarkDone?: (item: ReminderBoardItem) => void;
  isMarkingDone?: boolean;

  // Solo aplican a kind === 'seguimiento' -- los recordatorios creados
  // desde "+ Añadir Nuevo Recordatorio" (dosis/citas no se crean acá, así
  // que no se editan/eliminan desde acá).
  onDelete?: (item: ReminderBoardItem) => void;
  isDeleting?: boolean;
  onEdit?: (item: ReminderBoardItem) => void;
};

/**
 * Tarjeta unificada de "Recordatorios" (A10) -- dosis, cita o
 * seguimiento. Solo dosis y seguimiento tienen acciones; una cita es
 * informativa (mismo criterio que el Figma, que no le muestra botón).
 */
export function ReminderCard({
  item,
  onRegisterDose,
  isRegistering = false,
  onSkipDose,
  isSkipping = false,
  onPostponeDose,
  isPostponing = false,
  onAddProgress,
  isAddingProgress = false,
  onMarkDone,
  isMarkingDone = false,
  onDelete,
  isDeleting = false,
  onEdit,
  canManage = true,
}: ReminderCardProps) {
  const isBusy =
    isRegistering || isSkipping || isPostponing || isAddingProgress || isMarkingDone || isDeleting;

  const isGoalComplete =
    item.kind === 'seguimiento' &&
    item.objetivoCantidad != null &&
    item.objetivoCantidad > 0 &&
    (item.progresoActual ?? 0) >= item.objetivoCantidad;

  // "Rutina simple" (sin objetivo) completada -- "Marcar como hecho" ya
  // no la quita del tablero, se queda marcada en vez de desaparecer.
  const isRutinaComplete = item.kind === 'seguimiento' && item.objetivoCantidad == null && item.done;

  const isCompleted = isGoalComplete || isRutinaComplete;

  return (
    <View className="gap-3 rounded-2xl border border-lumen-300 bg-bone-300 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-lumen-300">
            <Ionicons name={iconForItem(item)} size={20} color={theme.colors.textPrimary} />
          </View>

          <View className="flex-1">
            <Text className="text-base font-semibold text-coal-900">{item.title}</Text>
            {item.subtitle ? (
              <Text className="text-sm text-coal-500">{item.subtitle}</Text>
            ) : null}
          </View>
        </View>

        {isCompleted ? (
          <GoalCompleteBadge />
        ) : item.priority === 'urgente' ? (
          <PriorityBadge />
        ) : null}
      </View>

      <View className="flex-row items-center gap-1">
        <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
        <Text className="text-sm text-coal-500">{formatItemTime(item.scheduledAt)}</Text>
      </View>

      {item.instructions ? (
        <Text className="text-sm text-coal-500">{item.instructions}</Text>
      ) : null}

      {item.kind === 'seguimiento' &&
      item.objetivoCantidad != null &&
      item.unidad != null ? (
        <ProgressBar
          actual={item.progresoActual ?? 0}
          objetivo={item.objetivoCantidad}
          unidad={item.unidad}
        />
      ) : null}

      {item.kind === 'dosis' && canManage ? (
        <View className="gap-2">
          <AppButton
            title={isRegistering ? 'Registrando…' : 'Marcar como tomado'}
            onPress={() => onRegisterDose?.(item)}
            loading={isRegistering}
            disabled={isBusy && !isRegistering}
            accessibilityLabel={`Marcar ${item.title} como tomado`}
          />
          <View className="flex-row justify-end gap-4">
            <AppButton
              title={isPostponing ? 'Posponiendo…' : 'Posponer'}
              variant="ghost"
              onPress={() => onPostponeDose?.(item)}
              loading={isPostponing}
              disabled={isBusy && !isPostponing}
              accessibilityLabel={`Posponer ${item.title}`}
            />
            <AppButton
              title={isSkipping ? 'Omitiendo…' : 'Omitir'}
              variant="ghost"
              onPress={() => onSkipDose?.(item)}
              loading={isSkipping}
              disabled={isBusy && !isSkipping}
              accessibilityLabel={`Omitir ${item.title}`}
            />
          </View>
        </View>
      ) : null}

      {item.kind === 'seguimiento' && canManage ? (
        <View className="gap-2">
          {item.objetivoCantidad != null ? (
            <AppButton
              title={isAddingProgress ? 'Guardando…' : 'Actualizar avance'}
              variant="secondary"
              onPress={() => onAddProgress?.(item)}
              loading={isAddingProgress}
              disabled={isBusy && !isAddingProgress}
              accessibilityLabel={`Actualizar avance de ${item.title}`}
            />
          ) : isRutinaComplete ? null : (
            <AppButton
              title={isMarkingDone ? 'Guardando…' : 'Marcar como hecho'}
              onPress={() => onMarkDone?.(item)}
              loading={isMarkingDone}
              disabled={isBusy && !isMarkingDone}
              accessibilityLabel={`Marcar ${item.title} como hecho`}
            />
          )}
          <View className="flex-row justify-end gap-4">
            <AppButton
              title="Editar"
              variant="ghost"
              onPress={() => onEdit?.(item)}
              disabled={isBusy}
              accessibilityLabel={`Editar recordatorio ${item.title}`}
            />
            <AppButton
              title={isDeleting ? 'Eliminando…' : 'Eliminar'}
              variant="ghost"
              onPress={() => onDelete?.(item)}
              loading={isDeleting}
              disabled={isBusy && !isDeleting}
              accessibilityLabel={`Eliminar recordatorio ${item.title}`}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
