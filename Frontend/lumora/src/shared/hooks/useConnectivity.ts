import { useSyncExternalStore } from 'react';

import { queryLifecycle } from '@/shared/api/query-lifecycle';

export function useConnectivity(): { isOnline: boolean; isOffline: boolean } {
  const isOnline = useSyncExternalStore(
    queryLifecycle.subscribeConnectivity,
    queryLifecycle.getConnectivitySnapshot,
    () => true,
  );

  return { isOnline, isOffline: !isOnline };
}
