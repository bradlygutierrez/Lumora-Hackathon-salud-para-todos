import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { TextInputProps } from 'react-native';

import { AppTextInput } from '@/shared/components/AppTextInput';

type FormTextFieldProps<TFieldValues extends FieldValues> = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'onBlur'
> & {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  helperText?: string;
};

/**
 * Adaptador entre React Hook Form y React Native.
 *
 * React web aproximado: `<input {...register('email')} />`.
 * React Native no tiene `<input>`, por eso `useController` conecta
 * `value`, `onBlur` y `onChangeText` con nuestro `AppTextInput`.
 */
export function FormTextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  helperText,
  ...props
}: FormTextFieldProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <AppTextInput
      {...props}
      label={label}
      helperText={helperText}
      error={fieldState.error?.message}
      value={field.value == null ? '' : String(field.value)}
      onBlur={field.onBlur}
      onChangeText={field.onChange}
    />
  );
}
