import axios, {
  type AxiosInstance,
} from 'axios';

import {
  env,
} from '@/config/env';

import type {
  CaregiverRegistrationRequest,
  CaregiverRegistrationResponse,
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

export class AuthApiService {
  private readonly publicClient: AxiosInstance;

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

  /** Registro de paciente: contrato histórico B08. */
  public register(
    data: PatientRegistrationRequest,
  ): Promise<RegistrationResponse> {
    return this.publicPost(
      '/auth/register',
      data,
    );
  }

  /** Registro público de cuidador: contrato B14. */
  public registerCaregiver(
    data: CaregiverRegistrationRequest,
  ): Promise<CaregiverRegistrationResponse> {
    return this.publicPost(
      '/auth/register/caregiver',
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

  public mfaMethods():
    Promise<MfaMethod[]> {
    return httpClient.get(
      '/auth/mfa/methods',
    );
  }

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

  public disableMfa(
    configuredMethodId: number,
  ): Promise<void> {
    return httpClient.delete(
      `/auth/mfa/${configuredMethodId}`,
    );
  }
}

export const authApi =
  new AuthApiService();
