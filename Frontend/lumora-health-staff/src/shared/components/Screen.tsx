import { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { theme } from '../constants/theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
});
