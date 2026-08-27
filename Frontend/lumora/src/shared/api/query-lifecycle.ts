import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
} from '@tanstack/react-query';

import {
  AppState,
  Platform,
  type AppStateStatus,
} from 'react-native';

/**
 * Gestor del ciclo de vida de TanStack Query.
 *
 * Responsabilidades:
 * - Informar a TanStack Query sobre la conectividad del dispositivo
 * - Informar a TanStack Query si la app está en primer plano o fondo
 * - Esto permite que React Query maneje mejor el almacenamiento en caché
 *
 * Comportamiento:
 * - Monitorea cambios en la conexión de red
 * - Monitorea cambios del estado de la app (abierta/cerrada)
 * - Solo se configura una vez
 *
 * @internal
 */
class QueryLifecycleManager {
  /** Bandera para asegurar que se configura solo una vez */
  private configured = false;
  /** Suscripción al evento de cambio de estado de la aplicación */
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  /**
   * Configura los listeners de ciclo de vida de TanStack Query.
   *
   * Flujo:
   * 1. Verifica si ya está configurado (evita duplicados)
   * 2. Configura listener de conectividad de red
   * 3. Configura listener de estado de la aplicación
   * 4. Retorna función para limpiar los listeners
   *
   * @returns Función para limpiar/desuscribirse de los eventos
   *
   * @example
   * ```typescript
   * const cleanup = configureQueryLifecycle();
   * // Al salir de la app
   * cleanup();
   * ```
   */
  configure(): () => void {
    if (this.configured) {
      return () => {};
    }

    this.configured = true;

    // Le dice a TanStack Query si el dispositivo
    // tiene conexión a Internet.
    onlineManager.setEventListener((setOnline) => {
      return NetInfo.addEventListener((state) => {
        setOnline(
          Boolean(
            state.isConnected &&
              state.isInternetReachable !== false,
          ),
        );
      });
    });

    // Le dice a TanStack Query si la aplicación
    // está actualmente abierta/activa.
    const handleAppState = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    };

    this.appStateSubscription = AppState.addEventListener(
      'change',
      handleAppState,
    );

    return () => {
      this.cleanup();
    };
  }

  /**
   * Limpia todas las suscripciones y resetea el estado.
   * Se llama al desmontar o cuando el usuario sale de la app.
   *
   * @private
   */
  private cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.configured = false;
  }
}

export const configureQueryLifecycle = (): (() => void) => {
  const manager = new QueryLifecycleManager();
  return manager.configure();
};