import * as SecureStore from 'expo-secure-store';

/**
 * Datos de sesión almacenados de forma segura.
 * Contiene los tokens necesarios para autenticarse con la API.
 */
export type StoredSession = {
  /** Token de acceso para realizar peticiones autenticadas */
  accessToken: string;
  /** Token para renovar el accessToken cuando expira */
  refreshToken: string;
};

/**
 * Gestor de sesión segura usando almacenamiento encriptado del dispositivo.
 *
 * Responsabilidades:
 * - Almacenar tokens de forma segura en el teléfono
 * - Recuperar tokens de forma segura
 * - Limpiar tokens cuando el usuario cierra sesión
 * - Manejar errores de lectura/escritura
 *
 * @example
 * ```typescript
 * // Obtener sesión
 * const session = await secureSession.get();
 *
 * // Guardar sesión después del login
 * await secureSession.set({ accessToken: '...', refreshToken: '...' });
 *
 * // Limpiar sesión al logout
 * await secureSession.clear();
 * ```
 */
class SecureSessionManager {
  /** Clave para identificar dónde guardar la sesión */
  private readonly SESSION_KEY = 'lumora.auth.session';

  /**
   * Obtiene la sesión almacenada de forma segura.
   *
   * @returns La sesión si existe, null si no hay sesión almacenada
   * @throws No lanza errores, retorna null en caso de fallo
   *
   * @example
   * ```typescript
   * const session = await secureSession.get();
   * if (session) {
   *   console.log('Tokens:', session.accessToken, session.refreshToken);
   * }
   * ```
   */
  async get(): Promise<StoredSession | null> {
    try {
      const raw = await SecureStore.getItemAsync(this.SESSION_KEY);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as StoredSession;
    } catch {
      await this.clear();
      return null;
    }
  }

  /**
   * Almacena una sesión de forma segura.
   * Cifra los datos antes de guardarlos en el dispositivo.
   *
   * @param session - Datos de sesión a guardar
   * @throws Puede lanzar error si el almacenamiento seguro no está disponible
   *
   * @example
   * ```typescript
   * await secureSession.set({
   *   accessToken: 'eyJhbGc...',
   *   refreshToken: 'eyJhbGc...'
   * });
   * ```
   */
  async set(session: StoredSession): Promise<void> {
    await SecureStore.setItemAsync(
      this.SESSION_KEY,
      JSON.stringify(session),
    );
  }

  /**
   * Limpia la sesión almacenada.
   * Se usa típicamente al hacer logout.
   *
   * @example
   * ```typescript
   * // Usuario hace logout
   * await secureSession.clear();
   * ```
   */
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(this.SESSION_KEY);
  }
}

export const secureSession = new SecureSessionManager();