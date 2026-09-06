import { Text, View } from 'react-native';

/**
 * Badge "Completado" -- mismo patrón visual que PriorityBadge (ver ese
 * archivo), pero con el tono mint (éxito) de la paleta en vez de warm.
 * Se muestra en la tarjeta de un recordatorio de Seguimiento con
 * objetivo una vez que el avance llega a la meta.
 */
export function GoalCompleteBadge() {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-mint-500 px-3 py-1">
      <Text className="text-xs font-semibold text-coal-900">✓ Completado</Text>
    </View>
  );
}
