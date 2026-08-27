import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/api-error';

/** Construye la política global de caché/reintentos de Lumora. */
class QueryClientManager {
  private readonly client: QueryClient;

  constructor() {
    this.client = new QueryClient(this.createConfig());
  }

  public getClient(): QueryClient {
    return this.client;
  }

  private createConfig(): QueryClientConfig {
    return {
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnReconnect: true,
          retry: this.shouldRetryQuery,
        },
        mutations: {
          // No repetimos automáticamente POST/PATCH/DELETE: una mutación
          // duplicada podría registrar dos veces una dosis, cita, etc.
          retry: false,
        },
      },
    };
  }

  private shouldRetryQuery = (
    failureCount: number,
    error: unknown,
  ): boolean => {
    if (error instanceof ApiError) {
      return error.isRetryable() && failureCount < 2;
    }

    // Para un error desconocido hacemos como máximo un reintento.
    return failureCount < 1;
  };
}

export const queryClient = new QueryClientManager().getClient();
