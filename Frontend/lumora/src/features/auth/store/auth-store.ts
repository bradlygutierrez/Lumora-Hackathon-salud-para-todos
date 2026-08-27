import { create } from 'zustand';

import {
  secureSession,
  type StoredSession,
} from '@/shared/api/secure-session';

type AuthStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  session: StoredSession | null;

  bootstrap: () => Promise<void>;
  setSession: (session: StoredSession) => Promise<void>;
  clearSession: () => Promise<void>;
};

/**
 * Gestor de autenticación que maneja el estado de sesión.
 *
 * Responsabilidades:
 * - Cargar la sesión guardada al iniciar la app
 * - Guardar la sesión cuando el usuario inicia sesión
 * - Limpiar la sesión cuando el usuario cierra sesión
 * - Manejar errores de forma segura
 *
 * Métodos:
 * - bootstrap: Se llama al cargar la app para restaurar sesión anterior
 * - setSession: Se llama después del login
 * - clearSession: Se llama al hacer logout
 *
 * @internal
 */
class AuthManager {
  /**
   * Carga la sesión anterior desde almacenamiento seguro.
   * Se ejecuta normalmente cuando la app inicia.
   *
   * Flujo:
   * 1. Intenta obtener la sesión guardada
   * 2. Si existe, marca el usuario como autenticado
   * 3. Si hay error, limpia la sesión y marca como no autenticado
   *
   * @param onStateChange - Callback para actualizar el estado en Zustand
   *
   * @example
   * ```typescript
   * // Se llama automáticamente en el component raíz
   * await bootstrap((state) => setAuthState(state));
   * ```
   */
  async bootstrap(
    onStateChange: (state: Partial<AuthState>) => void,
  ): Promise<void> {
    try {
      const session = await secureSession.get();

      onStateChange({
        session,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    } catch {
      await secureSession.clear();

      onStateChange({
        session: null,
        status: 'unauthenticated',
      });
    }
  }

  /**
   * Guarda una nueva sesión después del login.
   *
   * Flujo:
   * 1. Almacena los tokens de forma segura
   * 2. Actualiza el estado a autenticado
   *
   * @param session - Tokens obtenidos del servidor después del login
   * @param onStateChange - Callback para actualizar el estado en Zustand
   *
   * @example
   * ```typescript
   * const session = await login(email, password); // Desde API
   * await setSession(session, (state) => updateAuthStore(state));
   * ```
   */
  async setSession(
    session: StoredSession,
    onStateChange: (state: Partial<AuthState>) => void,
  ): Promise<void> {
    await secureSession.set(session);

    onStateChange({
      session,
      status: 'authenticated',
    });
  }

  /**
   * Limpia la sesión al hacer logout.
   *
   * Flujo:
   * 1. Borra los tokens de almacenamiento seguro
   * 2. Actualiza el estado a no autenticado
   *
   * @param onStateChange - Callback para actualizar el estado en Zustand
   *
   * @example
   * ```typescript
   * await clearSession((state) => updateAuthStore(state));
   * // Usuario ahora está desconectado
   * ```
   */
  async clearSession(
    onStateChange: (state: Partial<AuthState>) => void,
  ): Promise<void> {
    await secureSession.clear();

    onStateChange({
      session: null,
      status: 'unauthenticated',
    });
  }
}

const authManager = new AuthManager();

export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  session: null,

  bootstrap: () => authManager.bootstrap((state) => set(state)),
  setSession: (session) => authManager.setSession(session, (state) => set(state)),
  clearSession: () => authManager.clearSession((state) => set(state)),
}));