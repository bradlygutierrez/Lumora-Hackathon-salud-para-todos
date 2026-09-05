import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/shared/components/Button';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

type Props = PropsWithChildren<{
  title: string;
  subtitle: string;
  eyebrow?: string;
  onBack: () => void;
}>;

export function ClinicalFormShell({
  children,
  eyebrow = 'REGISTRO CLÍNICO',
  onBack,
  subtitle,
  title,
}: Props) {
  return (
    <Screen>
      <View style={styles.header}>
        <Button icon="arrow-back" onPress={onBack} variant="ghost">
          Volver
        </Button>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.accent} />
          <View style={styles.formBody}>{children}</View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    paddingTop: 5,
  },
  eyebrow: {
    color: theme.color.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: theme.color.text,
    fontSize: 27,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  formCard: {
    alignSelf: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 760,
    overflow: 'hidden',
    width: '100%',
  },
  accent: {
    backgroundColor: theme.color.primary,
    height: 5,
  },
  formBody: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
});
