import { sessionStore, type SessionTokens } from '../auth/session'
import { getApiBaseUrl } from '../config/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback

  const value = payload as Record<string, unknown>
  if (typeof value.detail === 'string') return value.detail
  if (typeof value.message === 'string') return value.message
  if (value.error && typeof value.error === 'object') {
    const nested = value.error as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }

  if (Array.isArray(value.detail)) {
    const messages = value.detail
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const record = item as Record<string, unknown>
        return typeof record.msg === 'string' ? record.msg : null
      })
      .filter((item): item is string => Boolean(item))
    if (messages.length) return messages.join('. ')
  }

  return fallback
}

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl = getApiBaseUrl()) {
    this.baseUrl = baseUrl
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl)
  }

  async request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiError(0, 'Configura VITE_API_URL para conectar el portal con el backend.')
    }

    const headers = new Headers(options.headers)
    const auth = options.auth !== false
    const tokens = sessionStore.read()

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (auth && tokens?.accessToken) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`)
    }

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...options, headers })
    } catch {
      throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
    }

    if (response.status === 401 && auth && retry && tokens?.refreshToken) {
      const refreshed = await this.refresh(tokens.refreshToken)
      if (refreshed) return this.request<T>(path, options, false)
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new ApiError(response.status, errorMessage(payload, `Error ${response.status}`))
    }

    if (response.status === 204) return undefined as T
    return await response.json() as T
  }

  private async refresh(refreshToken: string): Promise<boolean> {
    if (!this.baseUrl) return false

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      return false
    }

    if (!response.ok) {
      sessionStore.clear()
      return false
    }

    const tokens = await response.json() as { access_token: string; refresh_token: string }
    const next: SessionTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    }
    sessionStore.write(next)
    return true
  }
}

export const apiClient = new ApiClient()
