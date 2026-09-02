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

export function ClinicalSectionCard({
  id,
  title,
  count,
  icon,
  selected,
  onPress,
}: Props) {
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
        <Ionicons
          color={theme.color.primaryPressed}
          name={icon}
          size={22}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {count === 1 ? '1 registro' : `${count} registros`}
        </Text>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
      <Ionicons
        color={theme.color.primary}
        name="chevron-forward"
        size={18}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 4,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 82,
    padding: theme.spacing.md,
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
  },
  selected: {
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.primary,
  },
  pressed: {
    opacity: 0.76,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: theme.color.mutedText,
    fontSize: 11,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    minWidth: 29,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  countText: {
    color: theme.color.mutedText,
    fontSize: 11,
    fontWeight: '900',
  },
});
