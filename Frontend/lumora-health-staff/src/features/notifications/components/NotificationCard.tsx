import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/shared/constants/theme';
import { formatRelativeTime } from '../utils/format-relative-time';
import type { NotificationResponse, NotificationTipo } from '../types/notifications.types';

const ICON_BY_TIPO: Record<NotificationTipo, keyof typeof Ionicons.glyphMap> = {
  alerta: 'warning-outline',
  recordatorio: 'medkit-outline',
  cita: 'calendar-outline',
  sistema: 'information-circle-outline',
};

export function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationResponse;
  onPress: (id: number) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Notificación: ${notification.titulo}`}
      accessibilityRole="button"
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.card,
        notification.leido ? styles.read : styles.unread,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          color={theme.color.primaryPressed}
          name={ICON_BY_TIPO[notification.tipo]}
          size={20}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.headingRow}>
          <Text style={[styles.title, notification.leido ? null : styles.titleUnread]}>
            {notification.titulo}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(notification.creado_en)}</Text>
        </View>
        <Text style={styles.message}>{notification.mensaje}</Text>
      </View>
      {!notification.leido ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderLeftWidth: 4,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  unread: {
    borderLeftColor: theme.color.primary,
  },
  read: {
    borderLeftColor: theme.color.softBorder,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: theme.color.text,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  titleUnread: {
    fontWeight: '900',
  },
  time: {
    color: theme.color.subtleText,
    fontSize: theme.typography.caption,
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    lineHeight: 18,
  },
  unreadDot: {
    backgroundColor: theme.color.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
