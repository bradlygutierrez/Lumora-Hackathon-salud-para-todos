import axios, {
  type AxiosInstance,
} from 'axios';

import { env } from '@/config/env';
import {
  toApiError,
} from '@/shared/api/api-error';

/**
 * Respuesta real del endpoint GET /
 * de nuestra FastAPI.
 */
export type ApiHealthResponse = {
  message: string;
};

/**
 * Servicio encargado únicamente de comprobar
 * si la API pública de Lumora está disponible.
 *
 * React web equivalente:
 *
 * fetch('https://api.com/')
 *
 * pero encapsulado en una clase para mantener
 * la convención de servicios del proyecto.
 */
class ApiHealthService {
  private readonly client: AxiosInstance;

  constructor() {
    /**
     * IMPORTANTE:
     *
     * Aquí usamos env.apiUrl, NO env.apiV1Url.
     *
     * env.apiUrl:
     * https://backend-...fastapicloud.dev
     *
     * env.apiV1Url:
     * https://backend-...fastapicloud.dev/api/v1
     *
     * El health check existe en "/".
     */
    this.client = axios.create({
      baseURL: env.apiUrl,
      timeout: 10_000,

      headers: {
        Accept: 'application/json',
      },
    });
  }

  /**
   * Comprueba que FastAPI responda correctamente.
   *
   * Esperamos:
   *
   * {
   *   "message": "Lumora API"
   * }
   */
  public async check(): Promise<ApiHealthResponse> {
    try {
      const response =
        await this.client.get<ApiHealthResponse>(
          '/',
        );

      return response.data;
    } catch (error) {
      /**
       * Convertimos también estos errores al formato
       * estándar de Lumora.
       */
      throw toApiError(error);
    }
  }
}

/**
 * Singleton compartido por la aplicación.
 */
export const apiHealth =
  new ApiHealthService();