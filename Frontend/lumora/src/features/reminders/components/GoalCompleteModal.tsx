import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { theme } from '@/shared/theme/tokens';

type GoalCompleteModalProps = {
  visible: boolean;
  title: string;
  objetivoCantidad: number;
  unidad: string;
  onClose: () => void;
};

/**
 * Ventanita festiva que sale UNA vez cuando el avance de un recordatorio
 * de Seguimiento (ej. "Beber Agua") llega a su objetivo -- mismo patrón
 * visual que ConfirmDialog/PostponeDoseModal. Usa un ícono (mismo estilo
 * que el resto de la app) en vez de un emoji, que se veía fuera de tono
 * con la paleta suave de Lumora. La tarjeta en el tablero también se
 * queda marcada como completada (ver GoalCompleteBadge/ProgressBar) para
 * que se note incluso después de cerrar esta ventana.
 */
export function GoalCompleteModal({
  visible,
  title,
  objetivoCantidad,
  unidad,
  onClose,
}: GoalCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 items-center justify-center bg-black/30 px-4" onPress={onClose}>
        <Pressable
          className="w-full items-center gap-3 rounded-3xl bg-bone-100 p-6"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-mint-500">
            <Ionicons name="checkmark" size={32} color={theme.colors.textPrimary} />
          </View>

          <Text className="text-center text-xl font-bold text-coal-900">¡Felicidades!</Text>
          <Text className="text-center text-sm text-coal-500">
            Cumpliste tu objetivo de {objetivoCantidad} {unidad} en &quot;{title}&quot;.
          </Text>

          <View className="mt-2 w-full">
            <AppButton title="Aceptar" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
