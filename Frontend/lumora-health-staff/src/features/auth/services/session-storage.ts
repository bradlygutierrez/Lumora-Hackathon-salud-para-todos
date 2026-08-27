import * as SecureStore from 'expo-secure-store';

import type { StaffSession, TokenPairResponse } from '../types/auth.types';

const SESSION_KEY = 'lumora.healthStaff.session';

function toSession(tokens: TokenPairResponse): StaffSession {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type,
  };
}

export class SecureSessionManager {
  async getSession(): Promise<StaffSession | null> {
    const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as StaffSession;
    } catch {
      await this.clearSession();
      return null;
    }
  }

  async saveTokenPair(tokens: TokenPairResponse): Promise<StaffSession> {
    const session = toSession(tokens);
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export const secureSessionManager = new SecureSessionManager();
