import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  LumoraLogo,
} from '@/shared/components/branding/LumoraLogo';

type AuthHeaderProps = {
  title: string;
  subtitle: string;

  /**
   * Muestra botón para volver.
   *
   * B08 ya utilizaba esta propiedad,
   * por eso la conservamos para no romper
   * las pantallas existentes.
   */
  back?: boolean;
};

export function AuthHeader({
  title,
  subtitle,
  back = true,
}: AuthHeaderProps) {
  return (
    <View className="gap-4 pb-2 pt-4">
      <View className="relative items-center justify-center">
        {back ? (
          <Pressable
            accessibilityRole="button"
            className="absolute left-0 h-10 w-10 items-center justify-center rounded-full"
            onPress={() => {
              router.back();
            }}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#242a2f"
            />
          </Pressable>
        ) : null}

        <LumoraLogo
          size={36}
        />
      </View>

      <View className="items-center gap-2">
        <Text className="text-3xl font-bold text-coal-900">
          {title}
        </Text>

        <Text className="max-w-[280px] text-center text-sm leading-5 text-coal-500">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}