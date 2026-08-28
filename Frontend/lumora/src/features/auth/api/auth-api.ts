import axios, {
  type AxiosInstance,
} from 'axios';

import {
  env,
} from '@/config/env';

import type {
  CatalogPage,
  LoginResponse,
  MessageResponse,
  MfaActivationResponse,
  MfaMethod,
  MfaSetupResponse,
  PatientRegistrationRequest,
  RegistrationResponse,
  SessionRead,
  TokenPair,
} from '@/features/auth/types/auth.types';

import {
  toApiError,
} from '@/shared/api/api-error';

import {
  httpClient,
} from '@/shared/api/http-client';

import type {
  StoredSession,
} from '@/shared/api/secure-session';

/**
 * Cliente HTTP central del módulo B08.
 *
 * Separa deliberadamente:
 *
 * 1. Endpoints públicos:
 *    Login, registro, MFA login, refresh, etc.
 *
 * 2. Endpoints autenticados:
 *    Centro de seguridad, sesiones y configuración MFA.
 */
export class AuthApiService {
  private readonly publicClient: AxiosInstance;

  /**
   * Se permite inyectar una instancia Axios.
   *
   * Esto facilita:
   * - tests unitarios;
   * - mocks;
   * - evitar llamadas reales durante pruebas.
   */
  constructor(
    client?: AxiosInstance,
  ) {
    this.publicClient =
      client ??
      axios.create({
        baseURL:
          env.apiV1Url,

        timeout:
          15_000,

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',
        },
      });
  }

  /**
   * Convierte el formato HTTP del backend
   * al formato utilizado por SecureStore.
   */
  private toSession(
    tokens: TokenPair,
  ): StoredSession {
    return {
      accessToken:
        tokens.access_token,

      refreshToken:
        tokens.refresh_token,
    };
  }

  /**
   * Wrapper de requests POST que no requieren
   * una sesión autenticada.
   *
   * Toda excepción Axios es normalizada
   * utilizando ApiError.
   */
  private async publicPost<
    TResponse,
    TBody,
  >(
    url: string,
    body: TBody,
  ): Promise<TResponse> {
    try {
      const response =
        await this.publicClient.post<TResponse>(
          url,
          body,
        );

      return response.data;
    } catch (error) {
      throw toApiError(
        error,
      );
    }
  }

  // =========================================================
  // LOGIN
  // =========================================================

  /**
   * Inicia sesión usando username o email.
   *
   * Puede devolver:
   *
   * 1. Tokens finales.
   * 2. Un challenge MFA.
   */
  public login(
    login: string,
    password: string,
  ): Promise<LoginResponse> {
    return this.publicPost(
      '/auth/login',
      {
        login,
        password,
      },
    );
  }

  /**
   * Completa un challenge MFA iniciado durante login.
   *
   * El frontend no necesita saber cómo validar
   * internamente el factor.
   *
   * El backend sabe si el challenge corresponde a:
   * - Email OTP
   * - TOTP
   */
  public async verifyMfa(
    challengeToken: string,
    code: string,
  ): Promise<StoredSession> {
    const response =
      await this.publicPost<
        TokenPair,
        {
          challenge_token: string;
          code: string;
        }
      >(
        '/auth/mfa/verify',
        {
          challenge_token:
            challengeToken,

          code,
        },
      );

    return this.toSession(
      response,
    );
  }

  // =========================================================
  // TOKEN REFRESH
  // =========================================================

  /**
   * Renueva una sesión usando refresh token.
   *
   * Este request no utiliza httpClient para evitar
   * ciclos entre refresh e interceptores.
   */
  public async refreshSession(
    refreshToken: string,
  ): Promise<StoredSession> {
    const response =
      await this.publicPost<
        TokenPair,
        {
          refresh_token: string;
        }
      >(
        '/auth/refresh',
        {
          refresh_token:
            refreshToken,
        },
      );

    return this.toSession(
      response,
    );
  }

  // =========================================================
  // REGISTRO
  // =========================================================

  public register(
    data: PatientRegistrationRequest,
  ): Promise<RegistrationResponse> {
    return this.publicPost(
      '/auth/register',
      data,
    );
  }

  public verifyEmail(
    email: string,
    code: string,
  ): Promise<MessageResponse> {
    return this.publicPost(
      '/auth/verify-email',
      {
        email,
        code,
      },
    );
  }

  public resendVerification(
    email: string,
  ): Promise<MessageResponse> {
    return this.publicPost(
      '/auth/resend-verification',
      {
        email,
      },
    );
  }

  // =========================================================
  // PASSWORD RECOVERY
  // =========================================================

  public forgotPassword(
    email: string,
  ): Promise<MessageResponse> {
    return this.publicPost(
      '/auth/forgot-password',
      {
        email,
      },
    );
  }

  public resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    return this.publicPost(
      '/auth/reset-password',
      {
        token,

        new_password:
          newPassword,
      },
    );
  }

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  public sexCatalog():
    Promise<CatalogPage> {
    return httpClient.get(
      '/sexos?limit=100',
    );
  }

  public bloodTypeCatalog():
    Promise<CatalogPage> {
    return httpClient.get(
      '/tipos-sangre?limit=100',
    );
  }

  // =========================================================
  // SECURITY CENTER
  // =========================================================

  public changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    return httpClient.post<
      MessageResponse,
      {
        current_password: string;
        new_password: string;
      }
    >(
      '/auth/change-password',
      {
        current_password:
          currentPassword,

        new_password:
          newPassword,
      },
    );
  }

  // =========================================================
  // SESSION MANAGEMENT
  // =========================================================

  public sessions():
    Promise<SessionRead[]> {
    return httpClient.get(
      '/auth/sessions',
    );
  }

  public revokeSession(
    sessionId: number,
  ): Promise<void> {
    return httpClient.delete(
      `/auth/sessions/${sessionId}`,
    );
  }

  public logout():
    Promise<MessageResponse> {
    return httpClient.post<
      MessageResponse
    >(
      '/auth/logout',
    );
  }

  public logoutAll():
    Promise<MessageResponse> {
    return httpClient.post<
      MessageResponse
    >(
      '/auth/logout-all',
    );
  }

  public logoutOthers():
    Promise<MessageResponse> {
    return httpClient.post<
      MessageResponse
    >(
      '/auth/logout-others',
    );
  }

  // =========================================================
  // MFA MANAGEMENT
  // =========================================================

  /**
   * Devuelve los métodos MFA disponibles.
   *
   * Actualmente:
   * - email
   * - totp
   */
  public mfaMethods():
    Promise<MfaMethod[]> {
    return httpClient.get(
      '/auth/mfa/methods',
    );
  }

  /**
   * Inicia el enrollment de un factor MFA.
   *
   * IMPORTANTE:
   * Este endpoint NO activa el método.
   *
   * TOTP:
   * devuelve secret + provisioning_uri.
   *
   * Email:
   * envía OTP y devuelve metadata temporal.
   */
  public setupMfa(
    catalogMethodId: number,
  ): Promise<MfaSetupResponse> {
    return httpClient.post<
      MfaSetupResponse,
      {
        metodo_id: number;
      }
    >(
      '/auth/mfa/setup',
      {
        metodo_id:
          catalogMethodId,
      },
    );
  }

  /**
   * Confirma el enrollment MFA.
   *
   * Funciona para:
   * - Email OTP
   * - TOTP
   *
   * Solamente después de una confirmación válida
   * el método queda activo.
   */
  public confirmMfaSetup(
    configuredMethodId: number,
    code: string,
  ): Promise<MfaActivationResponse> {
    return httpClient.post<
      MfaActivationResponse,
      {
        method_id: number;
        code: string;
      }
    >(
      '/auth/mfa/setup/confirm',
      {
        method_id:
          configuredMethodId,

        code,
      },
    );
  }

  /**
   * Desactiva una configuración MFA.
   *
   * IMPORTANTE:
   * Recibe UsuarioMetodoMfa.id,
   * NO MetodoMfa.id.
   */
  public disableMfa(
    configuredMethodId: number,
  ): Promise<void> {
    return httpClient.delete(
      `/auth/mfa/${configuredMethodId}`,
    );
  }
}

/**
 * Singleton utilizado por hooks y pantallas.
 *
 * Centralizarlo evita crear un nuevo cliente
 * por cada render de React.
 */
export const authApi =
  new AuthApiService();