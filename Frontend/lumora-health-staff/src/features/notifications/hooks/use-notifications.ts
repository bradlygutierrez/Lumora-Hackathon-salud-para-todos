import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import { listMyNotifications, markNotificationAsRead } from '../api/notifications.api';

export function useNotifications() {
  const { session } = useAuthSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications.mine(userId ?? 0);

  const query = useQuery({
    queryKey,
    queryFn: () => listMyNotifications(userId as number),
    enabled: typeof userId === 'number',
  });

  const markAsRead = useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const notifications = query.data ?? [];

  return {
    ...query,
    notifications,
    unreadCount: notifications.filter((item) => !item.leido).length,
    markAsRead,
  };
}
