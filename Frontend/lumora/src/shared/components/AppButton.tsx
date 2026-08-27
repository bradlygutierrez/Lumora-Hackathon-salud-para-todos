import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

import { theme } from '@/shared/theme/tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost';

type AppButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

/**
 * Clases asociadas a cada variante.
 *
 * Similar a tener variantes de un Button
 * en React + Tailwind web.
 */
const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary:
    'bg-lumen-500',

  secondary:
    'bg-warm-500',

  ghost:
    'border border-lumen-500 bg-transparent',
};

/**
 * Botón base de Lumora.
 *
 * Toda feature debe reutilizar este componente
 * antes de crear un botón propio.
 */
export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...props
}: AppButtonProps) {
  const isDisabled =
    disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      className={`
        min-h-12
        items-center
        justify-center
        rounded-xl
        px-6
        ${variantClasses[variant]}
        ${
          isDisabled
            ? 'bg-bone-500 opacity-60'
            : 'active:opacity-75'
        }
      `}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            theme.colors.textPrimary
          }
        />
      ) : (
        <Text className="text-base font-semibold text-coal-900">
          {title}
        </Text>
      )}
    </Pressable>
  );
}