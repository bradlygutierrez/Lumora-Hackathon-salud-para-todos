import { useState, type PropsWithChildren } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import { theme } from '@/shared/theme/tokens';
import { useQueryClient } from '@tanstack/react-query';

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

  /** Permite actualizar las consultas activas deslizando hacia abajo. */
  refreshable?: boolean;
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
  refreshable = scrollable,
}: ScreenProps) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };
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
      refreshControl={
        refreshable ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
          />
        ) : undefined
      }
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
    <SafeAreaView className="relative flex-1 overflow-hidden bg-bone-100">
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <View
          style={{
            position: 'absolute',
            width: 210,
            height: 120,
            borderRadius: 80,
            backgroundColor: theme.colors.primary,
            opacity: 0.32,
            top: -54,
            right: -72,
            transform: [{ rotate: '-18deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 180,
            height: 104,
            borderRadius: 72,
            backgroundColor: theme.colors.mintSoft,
            opacity: 0.5,
            bottom: 48,
            left: -88,
            transform: [{ rotate: '24deg' }],
          }}
        />
      </View>
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
