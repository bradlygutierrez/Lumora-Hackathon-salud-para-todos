import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/shared/constants/theme';
import type { Medication } from '../types/prescription.types';

export function MedicationChoiceField({
  error,
  items,
  label,
  onChange,
  value,
}: {
  error?: string;
  items: Medication[];
  label: string;
  onChange: (value: string) => void;
  value?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {items.map((item) => {
            const selected = value === item.id;
            const secondary = [item.nombre_generico, item.concentracion]
              .filter(Boolean)
              .join(' · ');
            return (
              <Pressable
                accessibilityLabel={`Seleccionar medicamento ${item.nombre}`}
                accessibilityRole="button"
                key={item.id}
                onPress={() => onChange(item.id)}
                style={[styles.choice, selected ? styles.selected : null]}
              >
                <Text style={[styles.name, selected ? styles.selectedText : null]}>
                  {item.nombre}
                </Text>
                {secondary ? (
                  <Text style={[styles.secondary, selected ? styles.selectedText : null]}>
                    {secondary}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 2,
    minWidth: 130,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  selected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  name: { color: theme.color.text, fontSize: theme.typography.caption, fontWeight: '800' },
  secondary: { color: theme.color.mutedText, fontSize: 11 },
  selectedText: { color: '#FFFFFF' },
  error: { color: theme.color.danger, fontSize: theme.typography.caption },
});
