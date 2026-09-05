import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { NotificationCard } from '../components/NotificationCard';
import { useNotifications } from '../hooks/use-notifications';

export function NotificationsScreen() {
  const { isError, isLoading, markAsRead, notifications, unreadCount } = useNotifications();

  return (
    <Screen>
      <AppTopBar showBack />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Notificaciones</Text>
          {unreadCount > 0 ? (
            <Text style={styles.subtitle}>
              {unreadCount} sin leer
            </Text>
          ) : null}
        </View>

        {isLoading ? <LoadingState title="Cargando notificaciones" /> : null}
        {isError ? (
          <ErrorState
            message="Verificá la conexión e intentá nuevamente."
            title="No se pudieron cargar tus notificaciones"
          />
        ) : null}
        {!isLoading && !isError && notifications.length === 0 ? (
          <EmptyState
            message="Te avisaremos acá sobre tus citas y recordatorios."
            title="No tenés notificaciones"
          />
        ) : null}

        {!isLoading && !isError ? (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={(id) => markAsRead.mutate(id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  list: {
    gap: theme.spacing.md,
  },
});
