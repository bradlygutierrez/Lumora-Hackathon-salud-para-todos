import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

import { theme } from '@/shared/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type AppButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

/** Clases estáticas para que Tailwind/NativeWind pueda detectarlas al compilar. */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-lumen-500',
  secondary: 'bg-warm-500',
  ghost: 'border border-lumen-500 bg-transparent',
};

/** Botón accesible y reutilizable de Lumora. */
export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`min-h-12 items-center justify-center rounded-xl px-6 ${
        variantClasses[variant]
      } ${isDisabled ? 'bg-bone-500 opacity-60' : 'active:opacity-75'}`}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textPrimary} />
      ) : (
        <Text className="text-center text-base font-semibold text-coal-900">
          {title}
        </Text>
      )}
    </Pressable>
  );
}
