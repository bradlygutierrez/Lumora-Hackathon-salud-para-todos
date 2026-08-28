import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { TodayMedicationItem } from '@/features/prescriptions/types/prescriptions.types';
import { formatHora12h } from '@/features/prescriptions/utils/time-of-day';
import { AppButton } from '@/shared/components/AppButton';
import { theme } from '@/shared/theme/tokens';

type MedicationCardProps = {
  item: TodayMedicationItem;
  onRegisterDose: () => void;
  isRegistering: boolean;
  onCancelDose: () => void;
  isCanceling: boolean;
};

/**
 * Tarjeta de un medicamento programado dentro del "Plan de Hoy".
 *
 * Toda la tarjeta navega al detalle de la receta al tocarla; el botón de
 * "Registrar dosis"/"Cancelar" es un Pressable propio adentro, así que
 * tocarlo a él no dispara la navegación (React Native le da la respuesta
 * del toque al Pressable más específico bajo el dedo).
 */
export function MedicationCard({
  item,
  onRegisterDose,
  isRegistering,
  onCancelDose,
  isCanceling,
}: MedicationCardProps) {
  const isTaken = item.status === 'tomada';

  return (
    <Link
      href={{
        pathname: '/(app)/prescriptions/[recetaId]',
        params: { recetaId: item.recetaId },
      }}
      asChild
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Ver receta completa de ${item.medicamentoNombre}`}
        className={`gap-3 rounded-2xl border p-4 active:opacity-75 ${
          isTaken ? 'border-bone-500 bg-bone-500 opacity-70' : 'border-lumen-300 bg-bone-300'
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-lumen-300">
              <Ionicons name="medkit-outline" size={20} color={theme.colors.textPrimary} />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-coal-900">
                {item.medicamentoNombre}
              </Text>
              <Text className="text-sm text-coal-500">
                {item.dosis} · {item.frecuencia}
              </Text>
            </View>
          </View>

          {!isTaken ? (
            <View className="rounded-full bg-warm-500 px-3 py-1">
              <Text className="text-xs font-semibold text-coal-900">Pendiente</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text className="text-sm text-coal-500">{formatHora12h(item.hora)}</Text>
        </View>

        {isTaken ? (
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text className="text-sm text-coal-500">Tomada</Text>
            </View>

            <AppButton
              title={isCanceling ? 'Cancelando…' : 'Cancelar'}
              variant="ghost"
              loading={isCanceling}
              onPress={onCancelDose}
              accessibilityLabel={`Cancelar dosis registrada de ${item.medicamentoNombre}`}
            />
          </View>
        ) : (
          <AppButton
            title={isRegistering ? 'Registrando…' : 'Registrar dosis'}
            onPress={onRegisterDose}
            loading={isRegistering}
            accessibilityLabel={`Registrar dosis de ${item.medicamentoNombre}`}
          />
        )}
      </Pressable>
    </Link>
  );
}
