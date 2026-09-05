import { QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TourGuideOverlay, TourGuideProvider } from '@wrack/react-native-tour-guide';

import { authApi } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { CAREGIVER_PATIENTS_QUERY_KEY } from '@/features/shell/hooks/useCaregiverPatientsSync';
import { usePatientContextStore } from '@/features/shell/store/patient-context-store';
import { httpClient } from '@/shared/api/http-client';
import { queryClient } from '@/shared/api/query-client';
import { queryLifecycle } from '@/shared/api/query-lifecycle';
import { GlobalErrorBoundary } from '@/shared/components/GlobalErrorBoundary';
import { GlobalLoadingIndicator } from '@/shared/components/GlobalLoadingIndicator';
import { GlobalOfflineBanner } from '@/shared/components/GlobalOfflineBanner';
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider';

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
      await useAuthStore.getState().clearSession('session-expired');
      queryClient.clear();
    });

    // A13: un 403 en cualquier momento de la sesión probablemente
    // significa que el paciente cambió/revocó el acceso de este
    // cuidador. Invalidamos la lista de pacientes autorizados -- el
    // refetch inmediato dispara useCaregiverPatientsSync, que ya sabe
    // limpiar activePatient si dejó de estar autorizado.
    httpClient.setForbiddenHandler(async () => {
      if (usePatientContextStore.getState().role !== 'caregiver') {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: CAREGIVER_PATIENTS_QUERY_KEY,
      });
    });

    return () => {
      queryLifecycle.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <FeedbackProvider>
            <TourGuideProvider>
              {children}
              <TourGuideOverlay />
            </TourGuideProvider>
            <GlobalOfflineBanner />
            <GlobalLoadingIndicator />
          </FeedbackProvider>
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}
