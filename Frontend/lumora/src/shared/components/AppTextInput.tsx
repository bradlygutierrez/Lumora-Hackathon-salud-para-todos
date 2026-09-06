import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useId } from 'react';

import { theme } from '@/shared/theme/tokens';

type AppTextInputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

/**
 * Input visual base. No conoce React Hook Form; `FormTextField` actúa como
 * adaptador cuando un formulario necesita conectarlo al estado del form.
 */
export function AppTextInput({
  label,
  error,
  helperText,
  ...props
}: AppTextInputProps) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;

  return (
    <View className="gap-1">
      {label ? (
        <Text className="text-sm font-medium text-coal-900">{label}</Text>
      ) : null}

      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ disabled: props.editable === false }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        placeholderTextColor={theme.colors.textSecondary}
        className={`min-h-12 rounded-xl border bg-bone-300 px-4 text-base text-coal-900 ${
          error ? 'border-2 border-coal-900' : 'border-lumen-500'
        }`}
      />

      {error ? (
        <Text
          nativeID={errorId}
          accessibilityRole="alert"
          className="text-xs font-medium text-coal-900"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-xs text-coal-500">{helperText}</Text>
      ) : null}
    </View>
  );
}
