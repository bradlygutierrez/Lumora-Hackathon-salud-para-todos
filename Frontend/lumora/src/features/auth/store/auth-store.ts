import { create } from 'zustand';

import {
  secureSession,
  type StoredSession,
} from '@/shared/api/secure-session';

export type AuthStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated';

/**
 * Challenge MFA temporal.
 *
 * NO se persiste en SecureStore: si la app se reinicia, el usuario debe
 * iniciar sesión de nuevo. Así evitamos tratar un challenge corto como sesión.
 */
export type PendingMfa = {
  challengeToken: string;
  expiresIn: number;
};

type AuthState = {
  status: AuthStatus;
  session: StoredSession | null;
  pendingMfa: PendingMfa | null;

  bootstrap: () => Promise<void>;
  setSession: (session: StoredSession) => Promise<void>;
  clearSession: () => Promise<void>;
  setPendingMfa: (value: PendingMfa | null) => void;
};

/**
 * Encapsula el acceso al almacenamiento seguro.
 * Zustand se ocupa del estado reactivo; esta clase se ocupa de persistencia.
 */
class AuthSessionManager {
  public restore(): Promise<StoredSession | null> {
    return secureSession.get();
  }

  public persist(session: StoredSession): Promise<void> {
    return secureSession.set(session);
  }

  public clear(): Promise<void> {
    return secureSession.clear();
  }
}

const authSessionManager = new AuthSessionManager();

/**
 * Estado global pequeño de autenticación.
 *
 * React web equivalente aproximado: `AuthContext + useReducer`.
 * Los datos provenientes de FastAPI NO deben guardarse aquí; esos pertenecen
 * a TanStack Query. Aquí solo viven sesión y estado efímero de autenticación.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  session: null,
  pendingMfa: null,

  bootstrap: async () => {
    try {
      const session = await authSessionManager.restore();

      set({
        session,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    } catch {
      /**
       * Durante bootstrap fallamos de forma segura a no autenticado.
       * No intentamos escribir/borrar nuevamente si el storage nativo falló.
       */
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
      pendingMfa: null,
    });
  },

  clearSession: async () => {
    try {
      await authSessionManager.clear();
    } finally {
      set({
        session: null,
        status: 'unauthenticated',
        pendingMfa: null,
      });
    }
  },

  setPendingMfa: (pendingMfa) => {
    set({ pendingMfa });
  },
}));
