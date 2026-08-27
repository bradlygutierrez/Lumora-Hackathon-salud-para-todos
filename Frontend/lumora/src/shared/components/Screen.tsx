import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/shared/theme/tokens';

type ScreenProps = PropsWithChildren<{
  /** Activa scroll para formularios o contenido largo. */
  scrollable?: boolean;

  /** Utilities extra aplicadas al contenedor interno. */
  contentClassName?: string;
}>;

/**
 * Contenedor base de pantallas Lumora.
 *
 * React web equivalente: un `<main>` reutilizable que centraliza fondo,
 * padding y comportamiento de scroll.
 *
 * `SafeAreaView` viene de una librería externa; usamos `style` en él para
 * evitar depender del soporte de `className` de componentes de terceros.
 * NativeWind se usa normalmente en los componentes core internos.
 */
export function Screen({
  children,
  scrollable = false,
  contentClassName = '',
}: ScreenProps) {
  const safeAreaStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  } as const;

  if (scrollable) {
    return (
      <SafeAreaView style={safeAreaStyle}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className={`flex-1 px-4 py-4 ${contentClassName}`}>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={safeAreaStyle}>
      <View className={`flex-1 px-4 py-4 ${contentClassName}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
