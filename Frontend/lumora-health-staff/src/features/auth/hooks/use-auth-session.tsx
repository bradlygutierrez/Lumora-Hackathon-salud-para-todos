import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fastApiClient, type SessionTokens } from '@/src/shared/api/client';
import { loginStaff, logoutStaff, refreshStaffSession } from '../api/auth.api';
import { getStaffUser } from '../api/users.api';
import { secureSessionManager } from '../services/session-storage';
import type {
  LoginRequest,
  SessionStatus,
  StaffSession,
  TokenPairResponse,
} from '../types/auth.types';
import { getUserIdFromAccessToken } from '../utils/jwt';

type AuthSessionContextValue = {
  session: StaffSession | null;
  status: SessionStatus;
  permissions: Set<string>;
  signIn: (data: LoginRequest) => Promise<void>;
  completeTokenSignIn: (tokens: TokenPairResponse) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

function toClientSession(session: StaffSession): SessionTokens {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    tokenType: session.tokenType,
  };
}

function permissionSet(session: StaffSession | null) {
  return new Set(
    session?.user?.roles.flatMap((role) =>
      role.permisos.map((permission) => permission.nombre),
    ) ?? [],
  );
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('restoring');

  const clearSession = useCallback(async () => {
    await secureSessionManager.clearSession();
    setSession(null);
    setStatus('anonymous');
  }, []);

  const refreshSession = useCallback(async () => {
    const storedSession = await secureSessionManager.getSession();
    if (!storedSession) {
      return null;
    }

    const tokens = await refreshStaffSession(storedSession.refreshToken);
    const nextSession = {
      ...(await secureSessionManager.saveTokenPair(tokens)),
      userId: storedSession.userId,
      user: storedSession.user,
    };
    await secureSessionManager.saveSession(nextSession);
    setSession(nextSession);
    setStatus('authenticated');
    return toClientSession(nextSession);
  }, []);

  const enrichSession = useCallback(async (baseSession: StaffSession) => {
    const userId = baseSession.userId ?? getUserIdFromAccessToken(baseSession.accessToken);
    if (!userId) {
      return baseSession;
    }

    try {
      const user = await getStaffUser(userId);
      return { ...baseSession, userId, user };
    } catch {
      return { ...baseSession, userId };
    }
  }, []);

  useEffect(() => {
    fastApiClient.configureSession({
      getAccessToken: async () => session?.accessToken ?? null,
      refreshSession,
      clearSession,
    });
  }, [clearSession, refreshSession, session?.accessToken]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const storedSession = await secureSessionManager.getSession();
      if (!mounted) {
        return;
      }
      if (storedSession) {
        const enriched = await enrichSession(storedSession);
        if (!mounted) {
          return;
        }
        await secureSessionManager.saveSession(enriched);
        setSession(enriched);
      } else {
        setSession(null);
      }
      setStatus(storedSession ? 'authenticated' : 'anonymous');
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, [enrichSession]);

  const completeTokenSignIn = useCallback(async (tokens: TokenPairResponse) => {
    const baseSession = await secureSessionManager.saveTokenPair(tokens);
    const nextSession = await enrichSession(baseSession);
    await secureSessionManager.saveSession(nextSession);
    setSession(nextSession);
    setStatus('authenticated');
  }, [enrichSession]);

  const signIn = useCallback(async (data: LoginRequest) => {
    const tokens = await loginStaff(data);
    await completeTokenSignIn(tokens);
  }, [completeTokenSignIn]);

  const signOut = useCallback(async () => {
    try {
      if (session) {
        await logoutStaff();
      }
    } finally {
      await clearSession();
    }
  }, [clearSession, session]);

  const signOutAll = useCallback(async () => {
    const { logoutAllStaffSessions } = await import('../api/auth.api');
    try {
      if (session) {
        await logoutAllStaffSessions();
      }
    } finally {
      await clearSession();
    }
  }, [clearSession, session]);

  const reloadUser = useCallback(async () => {
    if (!session?.userId) {
      return;
    }
    const user = await getStaffUser(session.userId);
    const nextSession = { ...session, user };
    await secureSessionManager.saveSession(nextSession);
    setSession(nextSession);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      status,
      permissions: permissionSet(session),
      signIn,
      completeTokenSignIn,
      signOut,
      signOutAll,
      reloadUser,
    }),
    [completeTokenSignIn, reloadUser, session, signIn, signOut, signOutAll, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider');
  }
  return context;
}
