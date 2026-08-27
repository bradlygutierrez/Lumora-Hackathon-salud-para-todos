import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';

import { theme } from '@/shared/theme/tokens';

/**
 * Indicador no bloqueante de actividad de red global.
 * Un refetch de TanStack Query no debe congelar toda la interfaz.
 */
export function GlobalLoadingIndicator() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();

  if (fetching === 0 && mutating === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      className="absolute right-4 top-4 z-50 h-10 w-10 items-center justify-center rounded-full bg-lumen-300"
    >
      <ActivityIndicator size="small" color={theme.colors.textPrimary} />
    </View>
  );
}
