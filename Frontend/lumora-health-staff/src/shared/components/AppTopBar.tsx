import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';
import { LumoraBrand } from './LumoraBrand';
import { StaffAvatar } from './StaffAvatar';

export function AppTopBar() {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Ionicons color={theme.color.text} name="menu-outline" size={28} />
        <LumoraBrand compact />
      </View>
      <View style={styles.right}>
        <Ionicons color={theme.color.danger} name="notifications" size={22} />
        <StaffAvatar firstName="S" lastName="J" size={32} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  left: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
