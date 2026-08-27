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
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
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
    backgroundColor: '#FFD7D2',
    borderColor: '#FFD7D2',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: {
    backgroundColor: theme.color.primaryPressed,
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
