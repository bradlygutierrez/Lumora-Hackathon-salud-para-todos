import { create } from 'zustand';

import {
  secureSession,
  type StoredSession,
} from '@/shared/api/secure-session';

export type AuthStatus =
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
 * Servicio que encapsula la persistencia/restauración de la sesión.
 * Zustand sigue siendo el store; esta clase solo contiene operaciones
 * de sesión reutilizables, siguiendo la convención de clases del proyecto.
 */
class AuthSessionManager {
  public async restore(): Promise<StoredSession | null> {
    return secureSession.get();
  }

  public async persist(session: StoredSession): Promise<void> {
    await secureSession.set(session);
  }

  public async clear(): Promise<void> {
    await secureSession.clear();
  }
}

const authSessionManager = new AuthSessionManager();

/**
 * Store global pequeño de autenticación.
 *
 * React web equivalente aproximado: AuthContext + useReducer.
 * Los datos de servidor (citas, medicamentos, etc.) NO van aquí;
 * esos pertenecen a TanStack Query.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  session: null,

  bootstrap: async () => {
    try {
      const session = await authSessionManager.restore();

      set({
        session,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    } catch {
      await authSessionManager.clear();

      set({
        session: null,
        status: 'unauthenticated',
      });
    }
  },

  setSession: async (session) => {
    await authSessionManager.persist(session);

    set({
      session,
      status: 'authenticated',
    });
  },

  clearSession: async () => {
    await authSessionManager.clear();

    set({
      session: null,
      status: 'unauthenticated',
    });
  },
}));
