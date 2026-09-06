import {
  useIsFetching,
  useIsMutating,
} from '@tanstack/react-query';

import {
  ActivityIndicator,
  View,
} from 'react-native';

import {
  theme,
} from '@/shared/theme/tokens';

/**
 * Detecta actividad de TanStack Query globalmente.
 *
 * Importante:
 * NO bloqueamos toda la aplicación.
 *
 * Si una query hace refetch silencioso,
 * mostramos simplemente un pequeño indicador.
 */
export function GlobalLoadingIndicator() {
  const fetching =
    useIsFetching();

  const mutating =
    useIsMutating();

  const active =
    fetching > 0 ||
    mutating > 0;

  if (!active) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      className="
        absolute
        right-4
        top-4
        z-50
        h-10
        w-10
        items-center
        justify-center
        rounded-full
        bg-lumen-300
      "
    >
      <ActivityIndicator
        size="small"
        color={
          theme.colors.textPrimary
        }
      />
    </View>
  );
}