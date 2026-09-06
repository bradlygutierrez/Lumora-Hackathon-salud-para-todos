import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

type SurfaceCardProps = PropsWithChildren<{
  className?: string;
}>;

export function SurfaceCard({
  children,
  className = '',
}: SurfaceCardProps) {
  return (
    <View className={`rounded-3xl border border-coal-500/10 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </View>
  );
}
