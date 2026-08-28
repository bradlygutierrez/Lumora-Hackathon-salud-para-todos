import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { ResolvedPrescriptionDetail } from '@/features/prescriptions/hooks/usePrescriptionDetail';
import { theme } from '@/shared/theme/tokens';

type PrescriptionMedicationItemProps = {
  detalle: ResolvedPrescriptionDetail;
};

/** Fila de un medicamento dentro de "Medicamentos Recetados". */
export function PrescriptionMedicationItem({
  detalle,
}: PrescriptionMedicationItemProps) {
  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-bone-500 bg-bone-300 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-lumen-300">
        <Ionicons name="medical-outline" size={20} color={theme.colors.textPrimary} />
      </View>

      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-coal-900">
          {detalle.medicamentoNombre}
        </Text>
        <Text className="text-sm text-coal-500">
          {detalle.dosis} · Vía {detalle.viaAdministracionNombre}
        </Text>

        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text className="text-sm text-coal-500">{detalle.frecuencia}</Text>
        </View>

        {detalle.instrucciones ? (
          <Text className="mt-1 text-sm text-coal-500">{detalle.instrucciones}</Text>
        ) : null}
      </View>
    </View>
  );
}
