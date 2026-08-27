import type { PropsWithChildren } from 'react';

import {
  ScrollView,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  /**
   * Cuando es true, la pantalla permite scroll.
   *
   * Ejemplo:
   * Login largo, Perfil, formularios, etc.
   */
  scrollable?: boolean;

  /**
   * Permite agregar Tailwind adicional desde
   * una pantalla específica.
   *
   * Ejemplo:
   * contentClassName="items-center justify-center"
   */
  contentClassName?: string;
}>;

/**
 * Layout base de todas las pantallas de Lumora.
 *
 * Centraliza:
 * - Safe Area
 * - color de fondo
 * - padding
 * - flex
 * - comportamiento de scroll
 *
 * Así evitamos repetir esta estructura
 * en cada pantalla.
 */
export function Screen({
  children,
  scrollable = false,
  contentClassName = '',
}: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-bone-100">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <View
            className={`flex-1 px-4 py-4 ${contentClassName}`}
          >
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bone-100">
      <View
        className={`flex-1 px-4 py-4 ${contentClassName}`}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}