import { apiClient, type ApiClient } from '../../shared/api/client'
import { sessionStore } from '../../shared/auth/session'
import type { CurrentUser, LoginResponse, TokenPair } from './types'

export class AuthApi {
  private readonly client: ApiClient

  constructor(client: ApiClient = apiClient) {
    this.client = client
  }

  isConfigured(): boolean {
    return this.client.isConfigured()
  }

  async login(login: string, password: string): Promise<LoginResponse> {
    return this.client.request<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ login, password }),
    })
  }

  async verifyMfa(challengeToken: string, code: string): Promise<TokenPair> {
    return this.client.request<TokenPair>('/auth/mfa/verify', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ challenge_token: challengeToken, code }),
    })
  }

  async me(): Promise<CurrentUser> {
    return this.client.request<CurrentUser>('/auth/me')
  }

  async logout(): Promise<void> {
    try {
      await this.client.request<{ message: string }>('/auth/logout', { method: 'POST' })
    } finally {
      sessionStore.clear()
    }
  }
}
