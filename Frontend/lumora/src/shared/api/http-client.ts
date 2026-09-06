import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { toApiError } from '@/shared/api/api-error';
import {
  secureSession,
  type StoredSession,
} from '@/shared/api/secure-session';

/** Request extendida para impedir ciclos infinitos de refresh. */
type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

/** Contrato que debe cumplir el servicio que renueva los tokens. */
export type RefreshHandler = (
  refreshToken: string,
) => Promise<StoredSession>;

/** Callback usado cuando ya no es posible recuperar la sesión. */
export type SessionExpiredHandler = () => void | Promise<void>;

/**
 * Callback usado cuando el backend responde 403 (A13).
 *
 * Un 403 durante la sesión normalmente significa que los permisos del
 * usuario cambiaron desde que se cargó el contexto -- por ejemplo, un
 * paciente le bajó el nivel de acceso a un cuidador, o le revocó el
 * acceso, mientras el cuidador seguía con la app abierta. No sabemos
 * reparar la request que falló, pero sí podemos refrescar el contexto
 * de permisos para que la UI deje de mostrar acciones que ya no están
 * autorizadas.
 */
export type ForbiddenHandler = () => void | Promise<void>;

/**
 * Cliente HTTP central de Lumora.
 *
 * Equivalente en React web: una instancia de Axios compartida, pero
 * encapsulada en una clase para mantener interceptores y estado interno.
 */
export class HttpClientManager {
  private readonly client: AxiosInstance;

  private refreshHandler: RefreshHandler | null = null;
  private sessionExpiredHandler: SessionExpiredHandler | null = null;
  private forbiddenHandler: ForbiddenHandler | null = null;

  /**
   * Una sola Promise de refresh puede ser compartida por varias requests
   * que fallen con 401 al mismo tiempo.
   */
  private refreshPromise: Promise<StoredSession> | null = null;

  /**
   * `client` es opcional para poder inyectar una instancia falsa en tests.
   */
  constructor(client?: AxiosInstance) {
    this.client =
      client ??
      axios.create({
        baseURL: env.apiV1Url,
        timeout: 15_000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

    this.configureInterceptors();
  }

  /** Registra la función que implementa POST /auth/refresh. */
  public setRefreshHandler(handler: RefreshHandler): void {
    this.refreshHandler = handler;
  }

  /** Registra qué hacer cuando el refresh deja de ser válido. */
  public setSessionExpiredHandler(handler: SessionExpiredHandler): void {
    this.sessionExpiredHandler = handler;
  }

  /** Registra qué hacer cuando el backend responde 403 (A13). */
  public setForbiddenHandler(handler: ForbiddenHandler): void {
    this.forbiddenHandler = handler;
  }

  /** GET tipado que devuelve directamente `response.data`. */
  public async get<TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await this.client.get<TResponse>(url, config);
    return response.data;
  }

  /** POST tipado. */
  public async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await this.client.post<TResponse>(url, body, config);
    return response.data;
  }

  /** PUT tipado. */
  public async put<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await this.client.put<TResponse>(url, body, config);
    return response.data;
  }

  /** PATCH tipado. */
  public async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await this.client.patch<TResponse>(url, body, config);
    return response.data;
  }

  /** DELETE tipado. */
  public async delete<TResponse>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await this.client.delete<TResponse>(url, config);
    return response.data;
  }

  private configureInterceptors(): void {
    this.configureRequestInterceptor();
    this.configureResponseInterceptor();
  }

  /** Añade el access token antes de enviar cada request autenticada. */
  private configureRequestInterceptor(): void {
    this.client.interceptors.request.use(async (config) => {
      if (
        typeof FormData !== 'undefined' &&
        config.data instanceof FormData
      ) {
        config.headers.delete('Content-Type');
      }

      const session = await secureSession.get();

      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }

      return config;
    });
  }

  /**
   * Si FastAPI devuelve 401, intenta una sola renovación y luego repite
   * la request original. Los demás errores se convierten a `ApiError`.
   */
  private configureResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleResponseError(error),
    );
  }

  private async handleResponseError(
    error: AxiosError,
  ): Promise<AxiosResponse> {
    const request = error.config as RetryableRequest | undefined;

    if (error.response?.status === 403) {
      // No bloqueamos la propagación del error por esto -- es un efecto
      // secundario best-effort para refrescar permisos/contexto.
      void this.forbiddenHandler?.();
    }

    if (error.response?.status !== 401 || !request) {
      throw toApiError(error);
    }

    // Si esta request ya fue reintentada, el refresh no solucionó la sesión.
    if (request._retry) {
      await this.expireSession();
      throw toApiError(error);
    }

    // B07 registra el handler real desde AuthApiService.
    if (!this.refreshHandler) {
      throw toApiError(error);
    }

    request._retry = true;

    const currentSession = await secureSession.get();

    if (!currentSession?.refreshToken) {
      await this.expireSession();
      throw toApiError(error);
    }

    try {
      // `??=` garantiza una sola renovación concurrente.
      this.refreshPromise ??= this.refreshHandler(
        currentSession.refreshToken,
      );

      const newSession = await this.refreshPromise;
      await secureSession.set(newSession);

      request.headers.Authorization = `Bearer ${newSession.accessToken}`;

      return await this.client(request);
    } catch (refreshError) {
      await this.expireSession();
      throw toApiError(refreshError);
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Limpia SecureStore y avisa al store de autenticación. */
  private async expireSession(): Promise<void> {
    await secureSession.clear();
    await this.sessionExpiredHandler?.();
  }
}

/** Singleton HTTP usado por las features. */
export const httpClient = new HttpClientManager();
