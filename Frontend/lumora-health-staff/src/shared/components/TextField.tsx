import { forwardRef } from 'react';
import {
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
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ error, icon, label, style, ...props }, ref) => (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputError : null]}>
        {icon ? <Ionicons color={theme.color.mutedText} name={icon} size={20} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.color.mutedText}
          style={[styles.input, style]}
          {...props}
        />
      </View>
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
  inputShell: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.color.text,
    fontSize: theme.typography.body,
    minHeight: 46,
  },
  inputError: {
    borderColor: theme.color.danger,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
  },
});
