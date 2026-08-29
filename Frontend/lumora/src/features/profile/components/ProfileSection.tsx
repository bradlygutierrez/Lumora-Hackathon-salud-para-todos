import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { SurfaceCard } from '@/shared/components/SurfaceCard';

export function ProfileSection({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <SurfaceCard>
      <Text className="text-lg font-semibold text-coal-900">{title}</Text>
      {subtitle ? <Text className="mt-1 text-xs text-coal-500">{subtitle}</Text> : null}
      <View className="mt-4 gap-4">{children}</View>
    </SurfaceCard>
  );
}
