import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';

type ButtonProps = PressableProps &
  PropsWithChildren<{
    icon?: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  }>;

export function Button({
  children,
  disabled,
  icon,
  loading,
  style,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const isOutline = variant === 'secondary' || variant === 'ghost';
  const contentColor =
    variant === 'danger'
      ? theme.color.danger
      : isOutline
        ? theme.color.text
        : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !isDisabled ? pressedStyles[variant] : null,
        isDisabled ? styles.disabled : null,
        // react-native-web adds a required `hovered` field to this callback's
        // parameter type that plain react-native doesn't declare, so the cast
        // is needed to satisfy both platforms' resolved types.
        typeof style === 'function'
          ? style({ pressed } as Parameters<typeof style>[0])
          : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons color={contentColor} name={icon} size={18} /> : null}
          <Text style={[styles.label, { color: contentColor }]}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primary: {
    backgroundColor: theme.color.primary,
    borderColor: theme.color.primary,
  },
  secondary: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.border,
  },
  danger: {
    backgroundColor: theme.color.dangerSoft,
    borderColor: theme.color.dangerSoft,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabled: {
    opacity: 0.65,
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});

// Each variant darkens/dims its own resting color when pressed, instead of
// every variant flashing the primary-blue pressed color regardless of fill.
const pressedStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.color.primaryPressed,
    borderColor: theme.color.primaryPressed,
  },
  secondary: { opacity: 0.7 },
  danger: { opacity: 0.7 },
  ghost: { opacity: 0.6 },
});
