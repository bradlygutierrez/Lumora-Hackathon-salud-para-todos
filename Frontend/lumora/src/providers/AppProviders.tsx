import {
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  type PropsWithChildren,
} from 'react';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  queryClient,
} from '@/shared/api/query-client';

import {
  GlobalErrorBoundary,
} from '@/shared/components/GlobalErrorBoundary';

/**
 * Contiene los providers globales de Lumora.
 *
 * En React web sería similar a:
 *
 * <QueryClientProvider>
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * </QueryClientProvider>
 *
 * Zustand NO necesita Provider.
 */
export function AppProviders({
  children,
}: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <QueryClientProvider
          client={queryClient}
        >
          {children}
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}