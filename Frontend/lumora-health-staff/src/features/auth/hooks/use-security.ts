import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/src/shared/api/query-keys';
import {
  disableMfaMethod,
  listMfaMethods,
  listStaffSessions,
  logoutAllStaffSessions,
} from '../api/auth.api';

export function useActiveSessions() {
  return useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: listStaffSessions,
  });
}

export function useMfaMethods() {
  return useQuery({
    queryKey: queryKeys.auth.mfaMethods,
    queryFn: listMfaMethods,
  });
}

export function useSecurityActions() {
  const queryClient = useQueryClient();

  const logoutAll = useMutation({
    mutationFn: logoutAllStaffSessions,
  });

  const disableMfa = useMutation({
    mutationFn: disableMfaMethod,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfaMethods });
    },
  });

  return { disableMfa, logoutAll };
}
