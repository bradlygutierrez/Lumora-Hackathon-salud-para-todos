import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightAccessibilityLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      error,
      icon,
      label,
      onBlur,
      onFocus,
      onRightIconPress,
      rightAccessibilityLabel,
      rightIcon,
      style,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputShell,
            focused ? styles.inputFocused : null,
            error ? styles.inputError : null,
          ]}
        >
          {icon ? (
            <Ionicons color={theme.color.mutedText} name={icon} size={22} />
          ) : null}
          <TextInput
            ref={ref}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            placeholderTextColor={theme.color.subtleText}
            style={[styles.input, style]}
            {...props}
          />
          {rightIcon ? (
            <Pressable
              accessibilityLabel={rightAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onRightIconPress}
            >
              <Ionicons color={theme.color.mutedText} name={rightIcon} size={23} />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  label: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
  },
  inputFocused: {
    borderColor: theme.color.primaryPressed,
    borderWidth: 2,
  },
  input: {
    color: theme.color.text,
    flex: 1,
    fontSize: theme.typography.body,
    minHeight: 50,
  },
  inputError: {
    borderColor: theme.color.danger,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
    lineHeight: 18,
  },
});
