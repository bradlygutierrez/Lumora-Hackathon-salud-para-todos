import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { AppTextInput } from '@/shared/components/AppTextInput';

type ProgressUpdateModalProps = {
  visible: boolean;
  title: string;
  objetivoCantidad: number;
  unidad: string;
  progresoActual: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (nuevoProgreso: number) => void;
};

/**
 * Ventanita del botón "Actualizar avance" de un recordatorio de
 * Seguimiento con objetivo (ej. "Beber Agua"). Pregunta cuánto se
 * acaba de hacer AHORA (no el total) y lo SUMA al avance que ya
 * llevaba -- pensado para recordatorios con varias horas al día (ej.
 * 08:00/12:00/16:00/20:00): en cada check-in la usuaria solo dice
 * "tomé 1 litro" sin tener que calcular el total acumulado ella misma.
 *
 * (Antes pedía el total directamente -- causaba que, al escribir de
 * nuevo lo que acababa de tomar en el siguiente check-in, el avance
 * anterior se sobrescribiera en vez de sumarse.)
 */
export function ProgressUpdateModal({
  visible,
  title,
  objetivoCantidad,
  unidad,
  progresoActual,
  isSubmitting,
  onCancel,
  onConfirm,
}: ProgressUpdateModalProps) {
  const [valor, setValor] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Reinicia el campo cada vez que se abre -- siempre empieza en blanco
  // porque es "cuánto agregas ahora", no el total.
  useEffect(() => {
    if (visible) {
      setValor('');
      setError(undefined);
    }
  }, [visible]);

  function handleConfirm() {
    const normalizado = valor.trim().replace(',', '.');
    const incremento = Number(normalizado);

    if (normalizado === '' || Number.isNaN(incremento) || incremento <= 0) {
      setError('Escribe cuánto avanzaste (mayor a 0).');
      return;
    }

    // No dejamos que el avance supere el objetivo -- la barra de progreso
    // no está pensada para mostrar más del 100%.
    const nuevoTotal = Math.min(progresoActual + incremento, objetivoCantidad);
    onConfirm(nuevoTotal);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 items-center justify-center bg-black/30 px-4" onPress={onCancel}>
        <Pressable
          className="w-full gap-4 rounded-3xl bg-bone-100 p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-xl font-bold text-coal-900">Actualizar avance</Text>
          <Text className="text-sm text-coal-500">
            Llevas {progresoActual} de tu meta de {objetivoCantidad} {unidad} en &quot;{title}
            &quot;. ¿Cuánto quieres agregar ahora?
          </Text>

          <AppTextInput
            label={`Cantidad a agregar (${unidad})`}
            placeholder="Ej. 0.5"
            keyboardType="decimal-pad"
            value={valor}
            onChangeText={setValor}
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
