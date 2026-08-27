import axios, { type AxiosInstance } from 'axios';

import { env } from '@/config/env';
import type {
  CatalogPage,
  LoginResponse,
  MessageResponse,
  MfaMethod,
  MfaSetupResponse,
  PatientRegistrationRequest,
  RegistrationResponse,
  SessionRead,
  TokenPair,
} from '@/features/auth/types/auth.types';
import { toApiError } from '@/shared/api/api-error';
import { httpClient } from '@/shared/api/http-client';
import type { StoredSession } from '@/shared/api/secure-session';

/**
 * Servicio central de autenticación B08.
 *
 * Hay dos clientes deliberadamente:
 *
 * 1. `publicClient` para login, register, verify, forgot/reset y refresh.
 *    Estas peticiones no deben depender de que exista una sesión previa.
 *
 * 2. `httpClient` para endpoints autenticados. Este cliente ya agrega
 *    `Authorization: Bearer ...` y conoce la rotación del refresh token.
 *
 * En React web esto sería parecido a mantener una instancia pública de
 * Axios y otra instancia protegida con interceptores.
 */
export class AuthApiService {
  private readonly publicClient: AxiosInstance;

  /**
   * La inyección opcional de Axios facilita tests sin hacer llamadas reales.
   */
  constructor(client?: AxiosInstance) {
    this.publicClient =
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

  /** Convierte el snake_case del backend al formato usado por SecureStore. */
  private toSession(tokens: TokenPair): StoredSession {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  /** POST público con normalización uniforme de errores FastAPI/Axios. */
  private async publicPost<TResponse, TBody>(
    url: string,
    body: TBody,
  ): Promise<TResponse> {
    try {
      const response = await this.publicClient.post<TResponse>(url, body);
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  /**
   * POST /auth/login
   *
   * Si MFA está deshabilitado devuelve tokens.
   * Si MFA está habilitado devuelve solamente challenge_token + expires_in.
   */
  public login(login: string, password: string): Promise<LoginResponse> {
    return this.publicPost('/auth/login', {
      login,
      password,
    });
  }

  /** Completa un challenge TOTP y recién entonces obtiene la sesión final. */
  public async verifyMfa(
    challengeToken: string,
    code: string,
  ): Promise<StoredSession> {
    const result = await this.publicPost<
      TokenPair,
      { challenge_token: string; code: string }
    >('/auth/mfa/verify', {
      challenge_token: challengeToken,
      code,
    });

    return this.toSession(result);
  }

  /**
   * POST /auth/refresh
   *
   * Se mantiene fuera de `httpClient` para evitar que un 401/400 del propio
   * refresh vuelva a disparar el interceptor y cree un ciclo infinito.
   */
  public async refreshSession(refreshToken: string): Promise<StoredSession> {
    const result = await this.publicPost<
      TokenPair,
      { refresh_token: string }
    >('/auth/refresh', {
      refresh_token: refreshToken,
    });

    return this.toSession(result);
  }

  /** Envía el DTO final del wizard. Backend lo crea en una sola transacción. */
  public register(
    data: PatientRegistrationRequest,
  ): Promise<RegistrationResponse> {
    return this.publicPost('/auth/register', data);
  }

  public verifyEmail(email: string, code: string): Promise<MessageResponse> {
    return this.publicPost('/auth/verify-email', {
      email,
      code,
    });
  }

  public resendVerification(email: string): Promise<MessageResponse> {
    return this.publicPost('/auth/resend-verification', { email });
  }

  public forgotPassword(email: string): Promise<MessageResponse> {
    return this.publicPost('/auth/forgot-password', { email });
  }

  public resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    return this.publicPost('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  /** Catálogos públicos requeridos por el paso 2 del registro. */
  public sexCatalog(): Promise<CatalogPage> {
    return httpClient.get('/sexos?limit=100');
  }

  public bloodTypeCatalog(): Promise<CatalogPage> {
    return httpClient.get('/tipos-sangre?limit=100');
  }

  // -----------------------------------------------------------------------
  // Endpoints autenticados del Centro de Seguridad
  // -----------------------------------------------------------------------

  public changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    return httpClient.post<
      MessageResponse,
      { current_password: string; new_password: string }
    >('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  public sessions(): Promise<SessionRead[]> {
    return httpClient.get('/auth/sessions');
  }

  public revokeSession(sessionId: number): Promise<void> {
    return httpClient.delete(`/auth/sessions/${sessionId}`);
  }

  public logout(): Promise<MessageResponse> {
    return httpClient.post<MessageResponse>('/auth/logout');
  }

  public logoutAll(): Promise<MessageResponse> {
    return httpClient.post<MessageResponse>('/auth/logout-all');
  }

  public logoutOthers(): Promise<MessageResponse> {
    return httpClient.post<MessageResponse>('/auth/logout-others');
  }

  /** Backend B08 anuncia únicamente TOTP. Nunca debemos mostrar SMS. */
  public mfaMethods(): Promise<MfaMethod[]> {
    return httpClient.get('/auth/mfa/methods');
  }

  public setupMfa(methodId: number): Promise<MfaSetupResponse> {
    return httpClient.post<MfaSetupResponse, { metodo_id: number }>(
      '/auth/mfa/setup',
      { metodo_id: methodId },
    );
  }

  /** El backend espera el ID de UsuarioMetodoMfa, no el catálogo metodo_id. */
  public disableMfa(configuredMethodId: number): Promise<void> {
    return httpClient.delete(`/auth/mfa/${configuredMethodId}`);
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const authApi = new AuthApiService();
