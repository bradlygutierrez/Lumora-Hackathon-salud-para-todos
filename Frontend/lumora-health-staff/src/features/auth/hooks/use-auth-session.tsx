import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { env } from '@/src/application/config/env';
import { fastApiClient, type SessionTokens } from '@/src/shared/api/client';
import { previewSession } from '@/src/shared/preview/health-staff-preview';
import { loginStaff, logoutStaff, refreshStaffSession } from '../api/auth.api';
import { getCurrentStaffUser } from '../api/users.api';
import { secureSessionManager } from '../services/session-storage';
import type {
  LoginRequest,
  PendingMfaChallenge,
  SessionStatus,
  StaffSession,
  TokenPairResponse,
} from '../types/auth.types';

type SignInOutcome = 'authenticated' | 'mfa_required';

type AuthSessionContextValue = {
  session: StaffSession | null;
  status: SessionStatus;
  pendingMfa: PendingMfaChallenge | null;
  permissions: Set<string>;
  signIn: (data: LoginRequest) => Promise<SignInOutcome>;
  completeTokenSignIn: (tokens: TokenPairResponse) => Promise<void>;
  startPreviewSession: () => Promise<void>;
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
  const [pendingMfa, setPendingMfa] = useState<PendingMfaChallenge | null>(null);

  const clearSession = useCallback(async () => {
    await secureSessionManager.clearSession();
    setSession(null);
    setPendingMfa(null);
    setStatus('anonymous');
  }, []);

  const refreshSession = useCallback(async () => {
    const storedSession = await secureSessionManager.getSession();
    if (!storedSession) {
      return null;
    }
    if (storedSession.isPreview) {
      return toClientSession(storedSession);
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
    if (baseSession.isPreview) {
      return baseSession;
    }

    try {
      const user = await getCurrentStaffUser(baseSession.accessToken);
      return { ...baseSession, userId: user.id, user };
    } catch {
      return baseSession;
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
      try {
        const storedSession = await secureSessionManager.getSession();
        if (!mounted) {
          return;
        }
        const sessionToRestore = storedSession ?? (env.enableUiPreview ? previewSession : null);
        if (sessionToRestore) {
          const enriched = await enrichSession(sessionToRestore);
          if (!mounted) {
            return;
          }
          await secureSessionManager.saveSession(enriched);
          setSession(enriched);
        } else {
          setSession(null);
        }
        setStatus(sessionToRestore ? 'authenticated' : 'anonymous');
      } catch {
        setSession(null);
        setStatus('anonymous');
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, [enrichSession]);

  const completeTokenSignIn = useCallback(async (tokens: TokenPairResponse) => {
    setPendingMfa(null);
    const baseSession = await secureSessionManager.saveTokenPair(tokens);
    const nextSession = await enrichSession(baseSession);
    await secureSessionManager.saveSession(nextSession);
    setSession(nextSession);
    setStatus('authenticated');
  }, [enrichSession]);

  const signIn = useCallback(async (data: LoginRequest): Promise<SignInOutcome> => {
    const response = await loginStaff(data);
    if (response.mfa_required) {
      setPendingMfa({
        challengeToken: response.challenge_token,
        expiresIn: response.expires_in,
        method: response.method,
      });
      return 'mfa_required';
    }

    await completeTokenSignIn(response);
    return 'authenticated';
  }, [completeTokenSignIn]);

  const startPreviewSession = useCallback(async () => {
    await secureSessionManager.saveSession(previewSession);
    setSession(previewSession);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (session) {
        if (session.isPreview) {
          await clearSession();
          return;
        }
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
        if (session.isPreview) {
          await clearSession();
          return;
        }
        await logoutAllStaffSessions();
      }
    } finally {
      await clearSession();
    }
  }, [clearSession, session]);

  const reloadUser = useCallback(async () => {
    if (!session || session.isPreview) {
      return;
    }
    const user = await getCurrentStaffUser(session.accessToken);
    const nextSession = { ...session, userId: user.id, user };
    await secureSessionManager.saveSession(nextSession);
    setSession(nextSession);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      status,
      pendingMfa,
      permissions: permissionSet(session),
      signIn,
      completeTokenSignIn,
      startPreviewSession,
      signOut,
      signOutAll,
      reloadUser,
    }),
    [
      completeTokenSignIn,
      reloadUser,
      pendingMfa,
      session,
      signIn,
      signOut,
      signOutAll,
      startPreviewSession,
      status,
    ],
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
