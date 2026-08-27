import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  back?: boolean;
};

/** Encabezado compartido por todas las pantallas públicas de B08. */
export function AuthHeader({
  title,
  subtitle,
  back = true,
}: AuthHeaderProps) {
  return (
    <View className="gap-3">
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          className="self-start py-1"
        >
          <Text className="text-base font-medium text-coal-700">‹ Volver</Text>
        </Pressable>
      ) : null}

      <View className="gap-1">
        <Text className="text-3xl font-bold text-coal-900">{title}</Text>
        {subtitle ? (
          <Text className="text-base leading-6 text-coal-500">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
