import {
  useQuery,
} from '@tanstack/react-query';

import {
  apiHealth,
} from '@/shared/api/api-health';

/**
 * Hook que conecta ApiHealthService con TanStack Query.
 *
 * React tradicional sin TanStack Query sería:
 *
 * const [data, setData] = useState(...)
 * const [loading, setLoading] = useState(...)
 * const [error, setError] = useState(...)
 *
 * useEffect(() => {
 *   apiHealth.check()
 * }, [])
 *
 * TanStack Query nos evita escribir todo eso.
 */
export function useApiHealth() {
  return useQuery({
    /**
     * Identificador único de esta query dentro
     * de la caché de TanStack.
     */
    queryKey: ['api-health'],

    /**
     * Función que realmente obtiene los datos.
     */
    queryFn: () =>
      apiHealth.check(),

    /**
     * No necesitamos consultar el health endpoint
     * constantemente.
     *
     * Durante 1 minuto consideramos el resultado
     * como fresco.
     */
    staleTime: 60_000,

    /**
     * Un fallo de red puede ser temporal.
     */
    retry: 1,
  });
}