import { QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { authApi } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { httpClient } from '@/shared/api/http-client';
import { queryClient } from '@/shared/api/query-client';
import { queryLifecycle } from '@/shared/api/query-lifecycle';
import { GlobalErrorBoundary } from '@/shared/components/GlobalErrorBoundary';
import { GlobalLoadingIndicator } from '@/shared/components/GlobalLoadingIndicator';

/**
 * Providers globales de Lumora.
 *
 * React web equivalente: envolver <App /> con QueryClientProvider,
 * error boundary y otros contextos globales. Zustand no necesita Provider.
 */
export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    queryLifecycle.configure();

    // Conecta el interceptor 401 con el contrato REAL de FastAPI.
    httpClient.setRefreshHandler((refreshToken) =>
      authApi.refreshSession(refreshToken),
    );

    // Si el refresh expira/revoca, eliminamos sesión y caché clínica.
    // Limpiar QueryClient es importante para no conservar datos del usuario
    // anterior en memoria después de perder la sesión.
    httpClient.setSessionExpiredHandler(async () => {
      await useAuthStore.getState().clearSession();
      queryClient.clear();
    });

    return () => {
      queryLifecycle.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {children}
          <GlobalLoadingIndicator />
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}
