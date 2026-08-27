import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export default function StaffDashboardScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Panel clínico</Text>
        <Text style={styles.subtitle}>Base lista para conectar flujos de personal médico.</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sesión</Text>
          <Text style={styles.cardValue}>Activa</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>API</Text>
          <Text style={styles.cardValue}>FastAPI</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  cardLabel: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
  cardValue: {
    color: theme.color.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '800',
  },
});
