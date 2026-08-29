import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { NotificationResponse } from '@/features/notifications/types/notifications.types';
import { formatRelativeTime } from '@/features/notifications/utils/format-relative-time';
import {
  actionsForNotification,
  NOTIFICATION_TIPO_VARIANTS,
} from '@/features/notifications/utils/notification-variants';
import { theme } from '@/shared/theme/tokens';

type NotificationCardProps = {
  notification: NotificationResponse;
  onMarkAsRead: (id: number) => void;
};

/** Tarjeta de una notificacion en "Notificaciones" (A09). */
export function NotificationCard({ notification, onMarkAsRead }: NotificationCardProps) {
  const variant = NOTIFICATION_TIPO_VARIANTS[notification.tipo];
  const actions = actionsForNotification(notification);

  function handleCardPress() {
    if (!notification.leido) {
      onMarkAsRead(notification.id);
    }
  }

  function handleActionPress(action: ReturnType<typeof actionsForNotification>[number]) {
    if (action.disabled) return;
    if (!notification.leido) {
      onMarkAsRead(notification.id);
    }
    if (action.href) {
      router.push(action.href);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Notificación: ${notification.titulo}`}
      onPress={handleCardPress}
      className={`flex-row gap-3 rounded-2xl border-l-4 p-4 ${variant.accentBorderClass} ${
        notification.leido ? 'bg-bone-500' : 'bg-bone-300'
      } active:opacity-90`}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${variant.iconBgClass}`}
      >
        <Ionicons name={variant.icon} size={18} color={theme.colors.textPrimary} />
      </View>

      <View className="flex-1 gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className={`flex-1 text-base text-coal-900 ${
              notification.leido ? 'font-semibold' : 'font-bold'
            }`}
          >
            {notification.titulo}
          </Text>
          <Text className="text-xs text-coal-500">
            {formatRelativeTime(notification.creado_en)}
          </Text>
        </View>

        <Text className="text-sm text-coal-500">{notification.mensaje}</Text>

        {actions.length > 0 ? (
          <View className="mt-1 flex-row flex-wrap gap-2">
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ disabled: action.disabled }}
                disabled={action.disabled}
                onPress={() => handleActionPress(action)}
                className={`self-start rounded-full px-4 py-2 ${
                  action.disabled
                    ? 'border border-bone-500 bg-bone-300 opacity-50'
                    : action.variant === 'primary'
                      ? 'bg-lumen-500'
                      : 'border border-bone-500 bg-bone-300'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    action.disabled ? 'text-coal-500' : 'text-coal-900'
                  }`}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
