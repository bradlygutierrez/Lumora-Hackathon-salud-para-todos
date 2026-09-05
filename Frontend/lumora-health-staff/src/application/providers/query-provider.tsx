import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { PropsWithChildren, useState } from 'react';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }),
);

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    setFocused(status === 'active');
  });
  return () => subscription.remove();
});

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 0,
            refetchOnMount: 'always',
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
