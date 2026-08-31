import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { theme } from '../constants/theme';
import { LumoraBrand } from './LumoraBrand';
import { StaffAvatar } from './StaffAvatar';

export function AppTopBar() {
  const { session } = useAuthSession();

  const firstName =
    session?.user?.persona.nombres?.trim().split(/\s+/)[0] ??
    session?.user?.username ??
    'Personal';
  const lastName =
    session?.user?.persona.apellidos?.trim().split(/\s+/)[0] ?? '';
  const displayName =
    session?.user?.persona.nombres && session?.user?.persona.apellidos
      ? `${firstName} ${lastName}`.trim()
      : firstName;

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <StaffAvatar
          firstName={firstName}
          lastName={lastName || firstName}
          size={34}
        />
        <Text numberOfLines={1} style={styles.name}>
          {displayName}
        </Text>
      </View>
      <LumoraBrand compact />
      <View style={styles.notification}>
        <Ionicons
          color={theme.color.primaryPressed}
          name="notifications-outline"
          size={24}
        />
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
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  name: {
    color: theme.color.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  notification: {
    alignItems: 'flex-end',
    flex: 1,
  },
});
