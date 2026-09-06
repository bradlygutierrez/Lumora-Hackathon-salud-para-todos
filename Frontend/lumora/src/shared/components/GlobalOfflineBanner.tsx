import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useConnectivity } from '@/shared/hooks/useConnectivity';

export function GlobalOfflineBanner() {
  const { isOffline } = useConnectivity();

  if (!isOffline) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className="absolute inset-x-4 top-3 z-50 min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-coal-900 px-4 py-3"
    >
      <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
      <Text className="flex-shrink text-sm font-semibold text-white">
        Sin conexión. Podés seguir viendo la información disponible.
      </Text>
    </View>
  );
}
