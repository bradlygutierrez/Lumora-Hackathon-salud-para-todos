import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

type HomeHealthStateProps = {
  kind: 'loading' | 'error' | 'empty';
  title: string;
  message: string;
  onRetry?: () => void;
};

/** Estado visual reutilizable dentro de Inicio y Mi Salud. */
export function HomeHealthState({
  kind,
  title,
  message,
  onRetry,
}: HomeHealthStateProps) {
  return (
    <View className="items-center rounded-3xl border border-coal-500/10 bg-white px-6 py-10">
      {kind === 'loading' ? (
        <ActivityIndicator size="small" color="#4A86B6" />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-lumen-300">
          <Ionicons
            name={kind === 'error' ? 'cloud-offline-outline' : 'heart-outline'}
            size={22}
            color="#4A86B6"
          />
        </View>
      )}

      <Text className="mt-4 text-center text-lg font-semibold text-coal-900">
        {title}
      </Text>

      <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-coal-500">
        {message}
      </Text>

      {kind === 'error' && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-5 rounded-full bg-[#4A86B6] px-5 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
