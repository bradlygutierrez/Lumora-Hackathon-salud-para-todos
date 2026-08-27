import { Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { Screen } from '@/shared/components/Screen';

type FullScreenStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Estado reutilizable para offline, acceso denegado y errores de pantalla. */
export function FullScreenState({
  title,
  message,
  actionLabel,
  onAction,
}: FullScreenStateProps) {
  return (
    <Screen contentClassName="items-center justify-center gap-4">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-lumen-300">
        <Text className="text-2xl font-bold text-coal-900">L</Text>
      </View>

      <Text className="text-center text-2xl font-bold text-coal-900">
        {title}
      </Text>

      <Text className="max-w-sm text-center text-base leading-6 text-coal-500">
        {message}
      </Text>

      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} />
      ) : null}
    </Screen>
  );
}
