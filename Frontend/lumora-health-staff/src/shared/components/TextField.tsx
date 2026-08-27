import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { theme } from '../constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ error, label, style, ...props }, ref) => (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.color.mutedText}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  ),
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.color.text,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.text,
    fontSize: theme.typography.body,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.color.danger,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
  },
});
