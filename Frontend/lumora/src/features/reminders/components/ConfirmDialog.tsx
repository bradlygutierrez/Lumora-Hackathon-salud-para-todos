import { Modal, Pressable, Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Ventanita de confirmación con el mismo estilo del resto de la app
 * (mismo patrón que PostponeDoseModal/OptionSelectField) -- reemplaza el
 * Alert.alert nativo del sistema (confirmDestructive), que se veía como
 * de otra aplicación. Se usa para Omitir dosis y Eliminar recordatorio.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/30 px-4"
        onPress={onCancel}
      >
        <Pressable
          className="w-full gap-4 rounded-3xl bg-bone-100 p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-xl font-bold text-coal-900">{title}</Text>
          <Text className="text-sm text-coal-500">{message}</Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <AppButton title="Cancelar" variant="ghost" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <AppButton
                title={isSubmitting ? 'Espera…' : confirmLabel}
                onPress={onConfirm}
                loading={isSubmitting}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
