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
import { secureSessionManager } from '../services/session-storage';
import type { LoginRequest, SessionStatus, StaffSession } from '../types/auth.types';

type AuthSessionContextValue = {
  session: StaffSession | null;
  status: SessionStatus;
  signIn: (data: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

function toClientSession(session: StaffSession): SessionTokens {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    tokenType: session.tokenType,
  };
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
    const nextSession = await secureSessionManager.saveTokenPair(tokens);
    setSession(nextSession);
    setStatus('authenticated');
    return toClientSession(nextSession);
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
      setSession(storedSession);
      setStatus(storedSession ? 'authenticated' : 'anonymous');
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (data: LoginRequest) => {
    const tokens = await loginStaff(data);
    const nextSession = await secureSessionManager.saveTokenPair(tokens);
    setSession(nextSession);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (session) {
        await logoutStaff();
      }
    } finally {
      await clearSession();
    }
  }, [clearSession, session]);

  const value = useMemo(
    () => ({
      session,
      status,
      signIn,
      signOut,
    }),
    [session, signIn, signOut, status],
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
