import * as SplashScreen from 'expo-splash-screen';

import {
  type PropsWithChildren,
  useEffect,
} from 'react';

import {
  useAuthStore,
} from '@/features/auth/store/auth-store';

/**
 * Evitamos que Expo oculte el splash automáticamente.
 *
 * Primero queremos averiguar si existe una sesión
 * guardada en SecureStore.
 */
void SplashScreen
  .preventAutoHideAsync()
  .catch(() => {
    // El splash puede haberse ocultado ya en desarrollo.
    // No necesitamos detener la aplicación por eso.
  });

/**
 * Inicializa la sesión de Lumora.
 *
 * React web equivalente:
 *
 * <AuthInitializer>
 *   <App />
 * </AuthInitializer>
 *
 * Al montar:
 * 1. Lee SecureStore.
 * 2. Actualiza Zustand.
 * 3. Cambia bootstrapping -> authenticated/unauthenticated.
 * 4. Oculta el splash nativo.
 */
export function AuthBootstrap({
  children,
}: PropsWithChildren) {
  const status = useAuthStore(
    (state) => state.status,
  );

  const bootstrap = useAuthStore(
    (state) => state.bootstrap,
  );

  /**
   * Se ejecuta una sola vez cuando monta
   * el componente.
   */
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /**
   * Cuando ya sabemos si existe sesión,
   * podemos ocultar el splash.
   */
  useEffect(() => {
    if (status !== 'bootstrapping') {
      void SplashScreen
        .hideAsync()
        .catch(() => {
          // En desarrollo puede haberse ocultado previamente.
        });
    }
  }, [status]);

  /**
   * Mientras restauramos sesión dejamos
   * visible el splash nativo.
   */
  if (status === 'bootstrapping') {
    return null;
  }

  return children;
}