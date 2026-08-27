import type { PropsWithChildren } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  /**
   * Permite hacer scroll en pantallas largas.
   *
   * Debe usarse en formularios como:
   * - Login
   * - Registro
   * - Recuperar contraseña
   * - Cambio de contraseña
   */
  scrollable?: boolean;

  /**
   * Clases adicionales para el contenido.
   */
  contentClassName?: string;

  /**
   * Activa el comportamiento para evitar
   * que el teclado cubra inputs.
   */
  keyboardAvoiding?: boolean;
}>;

/**
 * Contenedor base de las pantallas de Lumora.
 *
 * Responsabilidades:
 * - Safe Area
 * - background
 * - padding
 * - scroll
 * - evitar que el teclado cubra formularios
 *
 * React web equivalente aproximado:
 *
 * <main className="min-h-screen overflow-auto">
 *   ...
 * </main>
 *
 * pero React Native necesita KeyboardAvoidingView
 * porque el teclado ocupa parte real de la pantalla.
 */
export function Screen({
  children,
  scrollable = false,
  keyboardAvoiding = false,
  contentClassName = '',
}: ScreenProps) {
  /**
   * Contenido reutilizable.
   */
  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={
        Platform.OS === 'ios'
          ? 'interactive'
          : 'on-drag'
      }
      showsVerticalScrollIndicator={false}
    >
      <View
        className={`flex-1 px-4 py-4 ${contentClassName}`}
      >
        {children}
      </View>
    </ScrollView>
  ) : (
    <View
      className={`flex-1 px-4 py-4 ${contentClassName}`}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bone-100">
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
          keyboardVerticalOffset={0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}