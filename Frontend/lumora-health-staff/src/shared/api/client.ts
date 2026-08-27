import {
  create,
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/src/application/config/env';
import { toApiError } from './api-error';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
};

type SessionHandlers = {
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<SessionTokens | null>;
  clearSession: () => Promise<void>;
};

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

class FastApiClient {
  readonly instance: AxiosInstance;
  private sessionHandlers?: SessionHandlers;

  constructor(baseURL: string) {
    this.instance = create({
      baseURL,
      timeout: 15000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    this.instance.interceptors.request.use(this.authorizeRequest);
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const request = error.config as RetriableRequest | undefined;
        if (error.response?.status === 401 && request && !request._retry) {
          request._retry = true;
          const refreshed = await this.sessionHandlers?.refreshSession();
          if (refreshed) {
            request.headers.Authorization = `${refreshed.tokenType} ${refreshed.accessToken}`;
            return this.instance(request);
          }
          await this.sessionHandlers?.clearSession();
        }
        return Promise.reject(toApiError(error));
      },
    );
  }

  configureSession(handlers: SessionHandlers) {
    this.sessionHandlers = handlers;
  }

  clearSessionHandlers() {
    this.sessionHandlers = undefined;
  }

  private authorizeRequest = async (config: InternalAxiosRequestConfig) => {
    const token = await this.sessionHandlers?.getAccessToken();
    if (token) {
      config.headers.Authorization = `bearer ${token}`;
    }
    return config;
  };
}

export const fastApiClient = new FastApiClient(env.apiBaseUrl);
export const apiClient = fastApiClient.instance;
