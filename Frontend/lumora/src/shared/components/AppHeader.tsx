import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { LumoraLogo } from '@/shared/components/branding/LumoraLogo';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showNotification?: boolean;
  onNotificationPress?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  showNotification = false,
  onNotificationPress,
}: AppHeaderProps) {
  return (
    <View className="gap-4 border-b border-lumen-500/40 bg-bone-100 px-4 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {showBackButton ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons name="arrow-back" size={20} color="#242a2f" />
            </Pressable>
          ) : null}

          <LumoraLogo size={28} compact />
        </View>

        {showNotification ? (
          <Pressable
            accessibilityRole="button"
            onPress={onNotificationPress}
            className="h-10 w-10 items-center justify-center rounded-full border border-lumen-500/40 bg-white"
          >
            <Ionicons name="notifications-outline" size={18} color="#242a2f" />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      {title ? (
        <View className="gap-1">
          <Text className="text-3xl font-bold text-coal-900">{title}</Text>
          {subtitle ? (
            <Text className="text-sm leading-5 text-coal-500">{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
