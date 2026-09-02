import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';
import { LumoraBrand } from './LumoraBrand';

export function AppTopBar() {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <View style={styles.avatar}>
          <Ionicons color={theme.color.primaryPressed} name="person-outline" size={19} />
        </View>
      </View>

      <LumoraBrand compact />

      <View style={[styles.side, styles.sideRight]}>
        <Ionicons
          color={theme.color.primaryPressed}
          name="notifications-outline"
          size={23}
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
});
