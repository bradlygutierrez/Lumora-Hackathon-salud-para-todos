import {
  create,
} from 'zustand';

import type {
  MfaMethodName,
} from '@/features/auth/types/auth.types';

import {
  secureSession,
  type StoredSession,
} from '@/shared/api/secure-session';

/**
 * Estado general de autenticación.
 */
export type AuthStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated';

/**
 * Challenge MFA pendiente.
 *
 * Se mantiene únicamente en memoria.
 *
 * NO debe persistirse porque:
 * - tiene duración corta;
 * - no representa una sesión válida;
 * - reiniciar la app debe invalidar este flujo frontend.
 */
export type PendingMfa = {
  challengeToken: string;
  expiresIn: number;

  /**
   * Permite adaptar la UI según el factor.
   */
  method:
    MfaMethodName | null;
};

export type AuthNotice = 'session-expired' | null;

/**
 * Shape del store Zustand.
 */
type AuthState = {
  status: AuthStatus;

  session:
    StoredSession | null;

  pendingMfa:
    PendingMfa | null;

  notice: AuthNotice;

  bootstrap:
    () => Promise<void>;

  setSession:
    (
      session: StoredSession,
    ) => Promise<void>;

  clearSession:
    (notice?: AuthNotice) => Promise<void>;

  setPendingMfa:
    (
      value:
        PendingMfa | null,
    ) => void;
};

/**
 * Encapsula completamente la persistencia
 * física de una sesión.
 *
 * Zustand conoce estado.
 * Esta clase conoce SecureStore.
 */
class AuthSessionManager {
  /**
   * Recupera la sesión persistida.
   */
  public restore():
    Promise<StoredSession | null> {
    return secureSession.get();
  }

  /**
   * Persiste una sesión nueva.
   */
  public persist(
    session: StoredSession,
  ): Promise<void> {
    return secureSession.set(
      session,
    );
  }

  /**
   * Elimina completamente la sesión.
   */
  public clear():
    Promise<void> {
    return secureSession.clear();
  }
}

/**
 * Única instancia responsable de SecureStore.
 */
const authSessionManager =
  new AuthSessionManager();

/**
 * Estado global mínimo de autenticación.
 *
 * Los datos obtenidos mediante FastAPI
 * NO deberían guardarse aquí.
 *
 * Esos datos pertenecen a React Query.
 */
export const useAuthStore =
  create<AuthState>(
    (set) => ({
      status:
        'bootstrapping',

      session:
        null,

      pendingMfa:
        null,

      notice: null,

      /**
       * Restaura la sesión cuando inicia Lumora.
       */
      bootstrap:
        async () => {
          try {
            const session =
              await authSessionManager
                .restore();

            set({
              session,

              status:
                session
                  ? 'authenticated'
                  : 'unauthenticated',
            });
          } catch {
            /**
             * Si SecureStore falla, nunca asumimos
             * que existe una sesión válida.
             */
            set({
              session: null,

              status:
                'unauthenticated',
            });
          }
        },

      /**
       * Persiste una sesión válida y actualiza
       * inmediatamente el estado global.
       */
      setSession:
        async (
          session,
        ) => {
          await authSessionManager
            .persist(
              session,
            );

          set({
            session,

            status:
              'authenticated',

            /**
             * Ya completamos MFA.
             * El challenge deja de ser necesario.
             */
            pendingMfa:
              null,

            notice: null,
          });
        },

      /**
       * Borra la sesión incluso si SecureStore
       * produce una excepción.
       */
      clearSession:
        async (notice = null) => {
          try {
            await authSessionManager
              .clear();
          } finally {
            set({
              session:
                null,

              status:
                'unauthenticated',

              pendingMfa:
                null,

              notice,
            });
          }
        },

      /**
       * Actualiza el challenge MFA temporal.
       */
      setPendingMfa:
        (
          pendingMfa,
        ) => {
          set({
            pendingMfa,
          });
        },
    }),
  );
