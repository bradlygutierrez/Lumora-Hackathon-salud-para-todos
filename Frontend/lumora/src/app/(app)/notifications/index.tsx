import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { NotificationCard } from '@/features/notifications/components/NotificationCard';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';

type NotificationsTab = 'todas' | 'no_leidas';

/** "Notificaciones" -- A09. */
export default function NotificationsRoute() {
  const { notifications, unreadCount, isLoading, isError, refetch, markAsRead } =
    useNotifications();
  const [tab, setTab] = useState<NotificationsTab>('todas');

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando tus notificaciones"
        message="Estamos revisando tus notificaciones."
      />
    );
  }

  if (isError) {
    return (
      <FullScreenState
        title="No pudimos cargar tus notificaciones"
        message="Revisa tu conexión e intenta de nuevo."
        actionLabel="Reintentar"
        onAction={refetch}
      />
    );
  }

  const visibles = tab === 'no_leidas' ? notifications.filter((n) => !n.leido) : notifications;

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader title="Notificaciones" />

      <View className="flex-row gap-6 border-b border-bone-500 px-4 pt-2">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'todas' }}
          onPress={() => setTab('todas')}
          className={`pb-3 ${tab === 'todas' ? 'border-b-2 border-lumen-500' : ''}`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'todas' ? 'text-coal-900' : 'text-coal-500'
            }`}
          >
            Todas
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'no_leidas' }}
          onPress={() => setTab('no_leidas')}
          className={`flex-row items-center gap-1 pb-3 ${
            tab === 'no_leidas' ? 'border-b-2 border-lumen-500' : ''
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              tab === 'no_leidas' ? 'text-coal-900' : 'text-coal-500'
            }`}
          >
            No leídas
          </Text>
          {unreadCount > 0 ? (
            <View className="h-2 w-2 rounded-full bg-warm-500" />
          ) : null}
        </Pressable>
      </View>

      <View className="gap-3 px-4 py-4">
        {visibles.length === 0 ? (
          <View className="rounded-2xl border border-bone-500 bg-bone-500 p-6">
            <Text className="text-center text-base text-coal-500">
              {tab === 'no_leidas'
                ? 'No tienes notificaciones sin leer.'
                : 'No tienes notificaciones por ahora.'}
            </Text>
          </View>
        ) : (
          visibles.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
