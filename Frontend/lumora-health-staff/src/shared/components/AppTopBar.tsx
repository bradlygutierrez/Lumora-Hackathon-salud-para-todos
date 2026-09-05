import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotifications } from '@/src/features/notifications/hooks/use-notifications';
import { theme } from '../constants/theme';
import { LumoraBrand } from './LumoraBrand';

type AppTopBarProps = {
  showBack?: boolean;
};

export function AppTopBar({ showBack = false }: AppTopBarProps) {
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack ? (
          <Link asChild href="/(staff)">
            <Pressable accessibilityLabel="Volver" accessibilityRole="button">
              <View style={styles.avatar}>
                <Ionicons color={theme.color.primaryPressed} name="arrow-back" size={21} />
              </View>
            </Pressable>
          </Link>
        ) : (
          <Link asChild href="/(staff)/profile">
            <Pressable accessibilityLabel="Abrir mi perfil" accessibilityRole="button">
              <View style={styles.avatar}>
                <Ionicons color={theme.color.primaryPressed} name="person-outline" size={19} />
              </View>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.brandSlot}>
        <LumoraBrand compact />
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <Link asChild href="/(staff)/notifications">
          <Pressable
            accessibilityLabel="Abrir notificaciones"
            accessibilityRole="button"
            style={styles.notificationButton}
          >
            <Ionicons
              color={theme.color.primaryPressed}
              name="notifications-outline"
              size={23}
            />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderBottomColor: theme.color.softBorder,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.lg,
    // Cancela el padding de Screen pero deja un respiro extra debajo del
    // safe-area inset (que ahora sí se aplica en Android) para que el logo
    // no quede pegado al notch/cámara frontal.
    marginTop: -(theme.spacing.lg - theme.spacing.xs),
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  side: {
    alignItems: 'flex-start',
    flexShrink: 0,
    width: 36,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  brandSlot: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 36 / 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.color.danger,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  notificationButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
  },
});
