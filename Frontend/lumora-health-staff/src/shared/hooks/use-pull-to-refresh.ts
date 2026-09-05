import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Estado y callback para pasar a un `<RefreshControl>` -- refresca todas
 * las queries activas de React Query, igual que ya hacían el dashboard,
 * Ajustes y la Agenda antes de que esto se extrajera a un hook común.
 */
export function usePullToRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh: () => void onRefresh() };
}
