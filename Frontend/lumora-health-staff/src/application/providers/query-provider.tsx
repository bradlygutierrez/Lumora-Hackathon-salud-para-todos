import NetInfo from '@react-native-community/netinfo';
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }),
);

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
