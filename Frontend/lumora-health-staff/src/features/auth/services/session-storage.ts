import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { StaffSession, TokenPairResponse } from '../types/auth.types';

const SESSION_KEY = 'lumora.healthStaff.session';

class WebSessionStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }
}

function toSession(tokens: TokenPairResponse): StaffSession {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type,
  };
}

export class SecureSessionManager {
  private readonly webStorage = new WebSessionStorage();

  async getSession(): Promise<StaffSession | null> {
    const rawSession = await this.getItem(SESSION_KEY);
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
    await this.saveSession(session);
    return session;
  }

  async saveSession(session: StaffSession): Promise<void> {
    await this.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    await this.deleteItem(SESSION_KEY);
  }

  private async getItem(key: string) {
    if (Platform.OS === 'web') {
      return this.webStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  }

  private async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      return this.webStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  }

  private async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      return this.webStorage.deleteItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  }
}

export const secureSessionManager = new SecureSessionManager();
