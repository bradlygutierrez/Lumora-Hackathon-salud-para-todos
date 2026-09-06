import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import {
  useApiHealth,
} from '@/shared/hook/use-api-health';

import {
  theme,
} from '@/shared/theme/tokens';

/**
 * Indicador temporal de B07.
 *
 * Sirve para verificar visualmente que la app móvil
 * puede comunicarse con FastAPI Cloud.
 *
 * B08 puede eliminarlo cuando comencemos
 * el login real.
 */
export function ApiStatus() {
  const {
    data,
    isPending,
    isError,
    refetch,
  } = useApiHealth();

  if (isPending) {
    return (
      <View className="flex-row items-center gap-2">
        <ActivityIndicator
          size="small"
          color={
            theme.colors.textPrimary
          }
        />

        <Text className="text-sm text-coal-500">
          Comprobando API...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <Text
        className="text-sm font-medium text-coal-900"
        onPress={() => {
          void refetch();
        }}
      >
        API no disponible · tocar para reintentar
      </Text>
    );
  }

  return (
    <View className="flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full bg-lumen-500" />

      <Text className="text-sm text-coal-500">
        {data?.message ?? 'API conectada'}
      </Text>
    </View>
  );
}