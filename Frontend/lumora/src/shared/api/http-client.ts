import axios, {
  AxiosError,
  type AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { secureSession, type StoredSession } from './secure-session';
import { toApiError } from './api-error';

type RetryRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshHandler = (
  refreshToken: string,
) => Promise<StoredSession>;

/**
 * Gestor del cliente HTTP con autenticación y renovación de tokens.
 *
 * Responsabilidades:
 * - Crear instancia de Axios configurada
 * - Adjuntar token de acceso a todas las peticiones
 * - Renovar el token automáticamente cuando expira (401)
 * - Evitar múltiples renovaciones simultáneas
 * - Convertir errores de Axios a ApiError
 *
 * Flujo de renovación de tokens:
 * 1. Si una petición retorna 401, intenta renovar el token
 * 2. Usa el refreshToken para obtener un nuevo accessToken
 * 3. Guarda el nuevo token de forma segura
 * 4. Reintenta la petición original con el nuevo token
 * 5. Si hay múltiples peticiones esperando, solo una las renueva (evita duplicados)
 *
 * @internal
 */
class HttpClientManager {
  /** Instancia única del cliente HTTP */
  private client: AxiosInstance;
  /** Función para renovar tokens registrada por la app */
  private refreshHandler: RefreshHandler | null = null;
  /** Promise compartida para evitar múltiples renovaciones simultáneas */
  private refreshingPromise: Promise<StoredSession> | null = null;

  /**
   * Crea e inicializa el gestor HTTP.
   * Configura interceptores de request y response.
   */
  constructor() {
    this.client = this.createClient();
    this.setupInterceptors();
  }

  /**
   * Crea una instancia de Axios con configuración base.
   * Define URL base, timeout y headers por defecto.
   *
   * @returns Instancia configurada de Axios
   * @private
   */
  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: env.apiUrl,
      timeout: 15_000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Configura todos los interceptores del cliente.
   * Los interceptores son funciones que se ejecutan antes/después de cada petición.
   *
   * @private
   */
  private setupInterceptors(): void {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Interceptor de petición: adjunta el token de acceso a cada petición.
   * Se ejecuta ANTES de enviar cualquier petición HTTP.
   *
   * Flujo:
   * 1. Obtiene la sesión almacenada de forma segura
   * 2. Si existe accessToken, lo agrega al header Authorization
   * 3. Deja pasar la petición normalmente
   *
   * @private
   */
  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(async (config) => {
      const session = await secureSession.get();

      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }

      return config;
    });
  }

  /**
   * Interceptor de respuesta: maneja errores y renovación de tokens.
   * Se ejecuta DESPUÉS de recibir cualquier respuesta.
   *
   * Si la respuesta es exitosa, la deja pasar.
   * Si hay error, intenta renov el token si es 401 (no autenticado).
   *
   * @private
   */
  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleResponseError(error),
    );
  }

  /**
   * Maneja errores de respuesta.
   * Decide si intentar renovar el token o rechazar el error.
   *
   * Condiciones para NO renovar:
   * - No es un 401 (token expirado)
   * - No hay configuración de petición
   * - Ya se intentó renovar una vez (_retry = true)
   * - No hay handler de renovación registrado
   *
   * @param error - Error de Axios
   * @returns Promise rechazado con ApiError
   * @private
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    const request = error.config as RetryRequest | undefined;

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      !this.refreshHandler
    ) {
      return Promise.reject(toApiError(error));
    }

    return this.attemptTokenRefresh(request, error);
  }

  /**
   * Intenta renovar el token y reintentar la petición.
   *
   * Flujo:
   * 1. Marca la petición como "reintentada" para evitar loops
   * 2. Obtiene el refreshToken
   * 3. Usa el handler registrado para obtener un nuevo accessToken
   * 4. Guarda el nuevo token de forma segura
   * 5. Actualiza el header Authorization con el nuevo token
   * 6. Reintenta la petición original
   * 7. Si falla, limpia la sesión
   *
   * Optimización: Si ya hay una renovación en progreso, espera a esa misma
   * Promise en lugar de iniciar otra (evita duplicados).
   *
   * @param request - Configuración de la petición a reintentar
   * @param error - Error original (401)
   * @returns Promise que reintenta la petición
   * @private
   */
  private async attemptTokenRefresh(
    request: RetryRequest,
    error: AxiosError,
  ): Promise<never> {
    request._retry = true;

    const session = await secureSession.get();

    if (!session?.refreshToken) {
      await secureSession.clear();
      return Promise.reject(toApiError(error));
    }

    try {
      this.refreshingPromise ??= this.refreshHandler!(session.refreshToken);

      const newSession = await this.refreshingPromise;

      await secureSession.set(newSession);

      request.headers.Authorization = `Bearer ${newSession.accessToken}`;

      return this.client(request);
    } catch (refreshError) {
      await secureSession.clear();
      return Promise.reject(toApiError(refreshError));
    } finally {
      this.refreshingPromise = null;
    }
  }

  /**
   * Registra la función que renovará los tokens.
   * Se llama desde la app después de configurar AuthManager.
   *
   * @param handler - Función que recibe un refreshToken y retorna new tokens
   */
  registerRefreshHandler(handler: RefreshHandler): void {
    this.refreshHandler = handler;
  }

  /**
   * Obtiene la instancia única del cliente HTTP.
   *
   * @returns El cliente Axios configurado
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

const manager = new HttpClientManager();

export function registerRefreshHandler(handler: RefreshHandler): void {
  manager.registerRefreshHandler(handler);
}

export const httpClient = manager.getClient();