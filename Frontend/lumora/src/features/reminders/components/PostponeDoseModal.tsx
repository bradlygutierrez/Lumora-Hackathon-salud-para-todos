import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { AppTextInput } from '@/shared/components/AppTextInput';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

type PostponeDoseModalProps = {
  visible: boolean;
  medicamentoNombre: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (nuevaHora: string) => void;
};

/**
 * Ventanita del botón "Posponer" del tablero de Recordatorios (A10):
 * el usuario elige a qué hora quiere que se le vuelva a recordar la
 * dosis (mismo formato HH:MM de 24 horas que "Nuevo Recordatorio").
 */
export function PostponeDoseModal({
  visible,
  medicamentoNombre,
  isSubmitting,
  onCancel,
  onConfirm,
}: PostponeDoseModalProps) {
  const [hora, setHora] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Reinicia el campo cada vez que se abre para otra dosis.
  useEffect(() => {
    if (visible) {
      setHora('');
      setError(undefined);
    }
  }, [visible]);

  function handleConfirm() {
    const trimmed = hora.trim();
    if (!HORA_REGEX.test(trimmed)) {
      setError('Usa el formato HH:MM (24 horas).');
      return;
    }
    onConfirm(trimmed);
  }

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
          <Text className="text-xl font-bold text-coal-900">Posponer recordatorio</Text>
          <Text className="text-sm text-coal-500">
            ¿A qué hora querés que te recordemos {medicamentoNombre}?
          </Text>

          <AppTextInput
            label="Nueva hora"
            placeholder="Ej. 15:30 (24 horas)"
            keyboardType="numbers-and-punctuation"
            value={hora}
            onChangeText={setHora}
            error={error}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <AppButton title="Cancelar" variant="ghost" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <AppButton
                title={isSubmitting ? 'Guardando…' : 'Guardar'}
                onPress={handleConfirm}
                loading={isSubmitting}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
