import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

/**
 * Gestor del cliente de TanStack Query.
 *
 * Responsabilidades:
 * - Crear una instancia única de QueryClient
 * - Configurar políticas de reintento para consultas
 * - Configurar tiempo de datos "frescos" (staleTime)
 * - Manejar errores HTTP de forma inteligente
 *
 * Política de reintentos:
 * - Queries: reintenta hasta 2 veces, EXCEPTO para errores 401, 403, 404, 409, 422
 * - Mutations: no reintenta nunca
 * - Reconecta automáticamente cuando regresa la conectividad
 *
 * @internal
 */
class QueryClientManager {
  /** Instancia única del cliente de consultas */
  private client: QueryClient;

  /**
   * Crea e inicializa el gestor con el cliente de Query.
   */
  constructor() {
    this.client = new QueryClient(this.getConfig());
  }

  /**
   * Genera la configuración para el QueryClient.
   *
   * @returns Configuración con políticas de reintento y almacenamiento en caché
   * @private
   */
  private getConfig(): QueryClientConfig {
    return {
      defaultOptions: {
        queries: {
          retry: this.shouldRetryQuery,
          staleTime: 30_000,
          refetchOnReconnect: true,
        },

        mutations: {
          retry: false,
        },
      },
    };
  }

  /**
   * Decide si una consulta debe reintentar basado en el código de error.
   *
   * NO reintenta para:
   * - 401 (No autenticado)
   * - 403 (Prohibido)
   * - 404 (No encontrado)
   * - 409 (Conflicto)
   * - 422 (Validación fallida)
   *
   * SÍ reintenta para otros errores, máximo 2 veces.
   *
   * @param failureCount - Número de intentos previos
   * @param error - Error que ocurrió
   * @returns true si debe reintentar, false en caso contrario
   * @private
   */
  private shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
    const status = this.extractStatusCode(error);

    // No reintentar en ciertos códigos de error
    if (
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 409 ||
      status === 422
    ) {
      return false;
    }

    // Reintentar máximo 2 veces
    return failureCount < 2;
  };

  /**
   * Extrae el código de estado HTTP de un error.
   *
   * @param error - Error del que extraer el status
   * @returns Código HTTP si existe, null en caso contrario
   * @private
   */
  private extractStatusCode(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      return (error as { status: number }).status;
    }
    return null;
  }

  /**
   * Obtiene la instancia única del QueryClient.
   *
   * @returns El cliente configurado
   */
  getClient(): QueryClient {
    return this.client;
  }
}

const manager = new QueryClientManager();
export const queryClient = manager.getClient();