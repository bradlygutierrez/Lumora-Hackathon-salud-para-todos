import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/shared/constants/theme';
import type { CatalogItem } from '../types/patient.types';

type Props = {
  label: string;
  items: CatalogItem[];
  value?: number;
  onChange: (value: number | undefined) => void;
  optional?: boolean;
  clearLabel?: string;
  error?: string;
};

export function ChoiceField({ label, items, value, onChange, optional, clearLabel = 'No indicado', error }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {optional ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(undefined)}
              style={[styles.choice, value === undefined ? styles.selected : null]}
            >
              <Text style={[styles.text, value === undefined ? styles.selectedText : null]}>{clearLabel}</Text>
            </Pressable>
          ) : null}
          {items.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => onChange(item.id)}
              style={[styles.choice, value === item.id ? styles.selected : null]}
            >
              <Text style={[styles.text, value === item.id ? styles.selectedText : null]}>
                {item.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  label: { color: theme.color.text, fontSize: theme.typography.caption, fontWeight: '700' },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  choice: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  selected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  text: { color: theme.color.text, fontSize: theme.typography.caption, fontWeight: '700' },
  selectedText: { color: '#FFFFFF' },
  error: { color: theme.color.danger, fontSize: theme.typography.caption },
});
