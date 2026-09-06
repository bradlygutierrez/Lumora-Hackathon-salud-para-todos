import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { theme } from '@/shared/theme/tokens';

export type RemoteStateKind =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'forbidden'
  | 'not-found';

type RemoteStateProps = {
  kind: RemoteStateKind;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

const icons: Record<Exclude<RemoteStateKind, 'loading'>, keyof typeof Ionicons.glyphMap> = {
  empty: 'file-tray-outline',
  error: 'alert-circle-outline',
  offline: 'cloud-offline-outline',
  forbidden: 'lock-closed-outline',
  'not-found': 'search-outline',
};

export function RemoteState({
  kind,
  title,
  message,
  actionLabel,
  onAction,
}: RemoteStateProps) {
  const isLoading = kind === 'loading';

  return (
    <View
      accessibilityRole={isLoading ? 'progressbar' : kind === 'error' ? 'alert' : 'summary'}
      accessibilityLabel={`${title}. ${message}`}
      accessibilityState={{ busy: isLoading }}
      className="w-full items-center gap-4 rounded-3xl px-6 py-8"
    >
      <View
        importantForAccessibility="no-hide-descendants"
        className="h-14 w-14 items-center justify-center rounded-2xl bg-lumen-300"
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.textPrimary} />
        ) : (
          <Ionicons name={icons[kind]} size={26} color={theme.colors.textPrimary} />
        )}
      </View>

      <Text className="text-center text-2xl font-bold text-coal-900">{title}</Text>
      <Text className="max-w-sm text-center text-base leading-6 text-coal-500">
        {message}
      </Text>

      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className={`min-h-12 rounded-2xl bg-bone-500 opacity-70 ${className}`}
    />
  );
}
