import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';

type RemoteStateProps = {
  title: string;
  message?: string;
};

export function LoadingState({ title }: Pick<RemoteStateProps, 'title'>) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator color={theme.color.primary} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: RemoteStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

export function ErrorState({ title, message }: RemoteStateProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, styles.error]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
  error: {
    color: theme.color.danger,
  },
});
