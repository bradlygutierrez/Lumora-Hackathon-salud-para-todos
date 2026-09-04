import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotifications } from '@/src/features/notifications/hooks/use-notifications';
import { theme } from '../constants/theme';
import { LumoraBrand } from './LumoraBrand';

export function AppTopBar() {
  const { unreadCount } = useNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <View style={styles.avatar}>
          <Ionicons color={theme.color.primaryPressed} name="person-outline" size={19} />
        </View>
      </View>

      <LumoraBrand compact />

      <View style={[styles.side, styles.sideRight]}>
        <Link asChild href="/(staff)/notifications">
          <Pressable accessibilityLabel="Abrir notificaciones" accessibilityRole="button">
            <View>
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
            </View>
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
    marginTop: -theme.spacing.lg,
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  side: {
    alignItems: 'flex-start',
    flex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.color.danger,
    borderRadius: 8,
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
});
