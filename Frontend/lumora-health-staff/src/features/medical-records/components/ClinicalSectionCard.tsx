import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/shared/constants/theme';
import type { ClinicalSectionId } from '../types/medical-record.types';

type Props = {
  id: ClinicalSectionId;
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress: (id: ClinicalSectionId) => void;
};

export function ClinicalSectionCard({ id, title, count, icon, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityLabel={`Abrir sección ${title}`}
      accessibilityRole="button"
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.iconBox}>
        <Ionicons color={theme.color.primaryPressed} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{count === 1 ? '1 registro' : `${count} registros`}</Text>
      </View>
      <Ionicons color={theme.color.subtleText} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 76,
    padding: theme.spacing.md,
  },
  selected: {
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.primary,
  },
  pressed: { opacity: 0.78 },
  iconBox: {
    alignItems: 'center',
    backgroundColor: theme.color.appBackground,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { flex: 1, gap: 2 },
  title: { color: theme.color.text, fontSize: 15, fontWeight: '800' },
  meta: { color: theme.color.mutedText, fontSize: theme.typography.caption },
});
