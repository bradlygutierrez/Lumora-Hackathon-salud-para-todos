import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { MedicationCard } from '@/features/prescriptions/components/MedicationCard';
import type {
  TimeOfDayBucket,
  TodayMedicationItem,
} from '@/features/prescriptions/types/prescriptions.types';
import { TIME_OF_DAY_LABELS } from '@/features/prescriptions/utils/time-of-day';
import { theme } from '@/shared/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SECTION_ICONS: Record<TimeOfDayBucket, IconName> = {
  manana: 'sunny-outline',
  tarde: 'partly-sunny-outline',
  noche: 'moon-outline',
};

type MedicationSectionProps = {
  bucket: TimeOfDayBucket;
  items: TodayMedicationItem[];
  registeringHorarioId: string | null;
  onRegisterDose: (item: TodayMedicationItem) => void;
  cancelingHorarioId: string | null;
  onCancelDose: (item: TodayMedicationItem) => void;
};

/** Grupo "Mañana"/"Tarde"/"Noche" del Plan de Hoy. */
export function MedicationSection({
  bucket,
  items,
  registeringHorarioId,
  onRegisterDose,
  cancelingHorarioId,
  onCancelDose,
}: MedicationSectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name={SECTION_ICONS[bucket]} size={18} color={theme.colors.textPrimary} />
        <Text className="text-lg font-semibold text-coal-900">
          {TIME_OF_DAY_LABELS[bucket]}
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
          <Text className="text-sm text-coal-500">Sin medicación programada.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <MedicationCard
              key={item.horarioId}
              item={item}
              isRegistering={registeringHorarioId === item.horarioId}
              onRegisterDose={() => onRegisterDose(item)}
              isCanceling={cancelingHorarioId === item.horarioId}
              onCancelDose={() => onCancelDose(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
