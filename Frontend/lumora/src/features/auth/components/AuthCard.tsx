import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

/** Superficie visual reutilizable para agrupaciones de contenido de Auth. */
export function AuthCard({ children }: PropsWithChildren) {
  return (
    <View className="gap-4 rounded-2xl border border-lumen-300 bg-bone-100 p-5">
      {children}
    </View>
  );
}
