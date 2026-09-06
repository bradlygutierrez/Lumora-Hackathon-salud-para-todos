import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { env } from '@/src/application/config/env';
import { queryKeys } from '@/src/shared/api/query-keys';
import { previewMfaMethods, previewSessions } from '@/src/shared/preview/health-staff-preview';
import {
  disableMfaMethod,
  listMfaMethods,
  listStaffSessions,
  logoutAllStaffSessions,
  logoutOtherStaffSessions,
  revokeStaffSession,
} from '../api/auth.api';

export function useActiveSessions() {
  return useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: () => (env.enableUiPreview ? Promise.resolve(previewSessions) : listStaffSessions()),
  });
}

export function useMfaMethods() {
  return useQuery({
    queryKey: queryKeys.auth.mfaMethods,
    queryFn: () => (env.enableUiPreview ? Promise.resolve(previewMfaMethods) : listMfaMethods()),
  });
}

export function useSecurityActions() {
  const queryClient = useQueryClient();

  const logoutAll = useMutation({
    mutationFn: () =>
      env.enableUiPreview
        ? Promise.resolve({ message: 'Preview local cerrado' })
        : logoutAllStaffSessions(),
  });

  const logoutOthers = useMutation({
    mutationFn: () =>
      env.enableUiPreview
        ? Promise.resolve({ message: 'Sesiones remotas cerradas en preview' })
        : logoutOtherStaffSessions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
    },
  });

  const revokeSession = useMutation({
    mutationFn: (sessionId: number) =>
      env.enableUiPreview ? Promise.resolve() : revokeStaffSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
    },
  });

  const disableMfa = useMutation({
    mutationFn: (methodId: number) =>
      env.enableUiPreview ? Promise.resolve() : disableMfaMethod(methodId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfaMethods });
    },
  });

  return { disableMfa, logoutAll, logoutOthers, revokeSession };
}
