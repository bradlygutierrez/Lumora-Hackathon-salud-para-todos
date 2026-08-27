import axios, { type AxiosInstance } from 'axios';

import { env } from '@/config/env';
import { toApiError } from '@/shared/api/api-error';
import type { StoredSession } from '@/shared/api/secure-session';

/** Respuesta real de TokenPair en FastAPI. */
type TokenPairResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type RefreshRequest = {
  refresh_token: string;
};

/**
 * API mínima de autenticación que necesita B07 para renovar sesiones.
 *
 * Usamos una instancia de Axios separada del HttpClientManager porque
 * `/auth/refresh` NO debe pasar por el interceptor que intenta refrescar
 * tokens: eso crearía un ciclo si el refresh token ya expiró.
 *
 * B08 ampliará esta clase con login, logout, MFA, recuperación, etc.
 */
class AuthApiService {
  private readonly client: AxiosInstance;

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
  }

  /**
   * Contrato real del backend:
   * POST /api/v1/auth/refresh
   * body: { refresh_token: string }
   */
  public async refreshSession(refreshToken: string): Promise<StoredSession> {
    try {
      const body: RefreshRequest = { refresh_token: refreshToken };

      const response = await this.client.post<TokenPairResponse>(
        '/auth/refresh',
        body,
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }
}

export const authApi = new AuthApiService();
