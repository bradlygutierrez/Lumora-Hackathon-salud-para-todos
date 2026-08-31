import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { listMyPatients } from '../api/my-patients.api';

export function useMyPatients() {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: ['clinical', 'professional-workspace', 'patients'],
    queryFn: () => (session?.isPreview ? Promise.resolve([]) : listMyPatients()),
  });
}
