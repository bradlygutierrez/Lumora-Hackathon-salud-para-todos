import { Text, View } from 'react-native';

import { ReminderCard } from '@/features/reminders/components/ReminderCard';
import type { ReminderBoardItem } from '@/features/reminders/types/reminders.types';

type ReminderSectionProps = {
  title: string;
  items: ReminderBoardItem[];
  emptyMessage: string;

  registeringId: string | null;
  onRegisterDose: (item: ReminderBoardItem) => void;
  skippingId: string | null;
  onSkipDose: (item: ReminderBoardItem) => void;
  postponingId: string | null;
  onPostponeDose: (item: ReminderBoardItem) => void;

  addingProgressId: string | null;
  onAddProgress: (item: ReminderBoardItem) => void;
  markingDoneId: string | null;
  onMarkDone: (item: ReminderBoardItem) => void;
  deletingId: string | null;
  onDelete: (item: ReminderBoardItem) => void;
  onEdit: (item: ReminderBoardItem) => void;

  /** false para un cuidador con acceso de solo lectura. */
  canManage: boolean;
};

/** Grupo "Próximamente"/"Más tarde" del tablero de Recordatorios. */
export function ReminderSection({
  title,
  items,
  emptyMessage,
  registeringId,
  onRegisterDose,
  skippingId,
  onSkipDose,
  postponingId,
  onPostponeDose,
  addingProgressId,
  onAddProgress,
  markingDoneId,
  onMarkDone,
  deletingId,
  onDelete,
  onEdit,
  canManage,
}: ReminderSectionProps) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-coal-900">{title}</Text>

      {items.length === 0 ? (
        <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
          <Text className="text-sm text-coal-500">{emptyMessage}</Text>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <ReminderCard
              key={item.id}
              item={item}
              onRegisterDose={onRegisterDose}
              isRegistering={registeringId === item.id}
              onSkipDose={onSkipDose}
              isSkipping={skippingId === item.id}
              onPostponeDose={onPostponeDose}
              isPostponing={postponingId === item.id}
              onAddProgress={onAddProgress}
              isAddingProgress={addingProgressId === item.id}
              onMarkDone={onMarkDone}
              isMarkingDone={markingDoneId === item.id}
              onDelete={onDelete}
              isDeleting={deletingId === item.id}
              onEdit={onEdit}
              canManage={canManage}
            />
          ))}
        </View>
      )}
    </View>
  );
}
