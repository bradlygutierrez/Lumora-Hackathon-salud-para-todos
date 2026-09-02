export type SessionTokens = {
  accessToken: string
  refreshToken: string
}

const SESSION_KEY = 'lumora.portal.session'

export class BrowserSessionStore {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  read(): SessionTokens | null {
    const raw = this.storage.getItem(SESSION_KEY)
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as Partial<SessionTokens>
      if (!parsed.accessToken || !parsed.refreshToken) return null
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      }
    } catch {
      return null
    }
  }

  write(tokens: SessionTokens): void {
    this.storage.setItem(SESSION_KEY, JSON.stringify(tokens))
  }

  clear(): void {
    this.storage.removeItem(SESSION_KEY)
  }
}

export const sessionStore = new BrowserSessionStore(window.sessionStorage)
