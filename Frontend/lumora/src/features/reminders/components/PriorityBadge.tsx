import { Text, View } from 'react-native';

/**
 * Badge "Urgente" -- ámbar, nunca rojo (ver theme/tokens.ts: "No tenemos
 * rojo en la paleta oficial"). Mismo tono que ya usa "Pendiente" en
 * MedicationCard y "Alta Prioridad" en Alertas de Salud (A09).
 */
export function PriorityBadge() {
  return (
    <View className="rounded-full bg-warm-500 px-3 py-1">
      <Text className="text-xs font-semibold text-coal-900">Urgente</Text>
    </View>
  );
}
