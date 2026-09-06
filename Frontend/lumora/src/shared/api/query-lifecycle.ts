import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  AppState,
  Platform,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';

/**
 * Sincroniza TanStack Query con el ciclo de vida real del teléfono.
 *
 * React web equivalente:
 * - NetInfo  ~= navigator.onLine
 * - AppState ~= document.visibilityState
 */
class QueryLifecycleManager {
  private configured = false;
  private appStateSubscription: NativeEventSubscription | null = null;
  private online = true;
  private readonly connectivityListeners = new Set<() => void>();

  public configure(): void {
    if (this.configured) {
      return;
    }

    this.configured = true;
    this.configureNetworkState();
    this.configureAppState();
  }

  /**
   * `onlineManager` conserva internamente el unsubscribe que retorna NetInfo.
   * Por eso no debemos intentar ejecutar el resultado de setEventListener().
   */
  private configureNetworkState(): void {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        const online = Boolean(
          state.isConnected && state.isInternetReachable !== false,
        );

        setOnline(online);

        if (online !== this.online) {
          this.online = online;
          this.connectivityListeners.forEach((listener) => listener());
        }
      }),
    );
  }

  public subscribeConnectivity = (listener: () => void): (() => void) => {
    this.connectivityListeners.add(listener);
    return () => this.connectivityListeners.delete(listener);
  };

  public getConnectivitySnapshot = (): boolean => this.online;

  private configureAppState(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppState,
    );
  }

  /** Arrow function para conservar `this` al usarla como callback. */
  private handleAppState = (status: AppStateStatus): void => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  };

  public cleanup(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    onlineManager.setEventListener(() => () => undefined);
    this.configured = false;
  }
}

/** Una sola instancia para toda la app. */
export const queryLifecycle = new QueryLifecycleManager();
