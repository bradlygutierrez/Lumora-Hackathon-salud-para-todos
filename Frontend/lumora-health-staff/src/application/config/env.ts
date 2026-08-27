import Constants from 'expo-constants';

type AppEnvironment = 'development' | 'test' | 'production';

type ExtraConfig = {
  EXPO_PUBLIC_API_URL?: string;
  EXPO_PUBLIC_APP_ENV?: AppEnvironment;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

function normalizeApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  extra.EXPO_PUBLIC_API_URL ??
  'http://localhost:8000/api/v1';

export const env = {
  apiBaseUrl: normalizeApiBaseUrl(configuredApiUrl),
  appEnvironment:
    process.env.EXPO_PUBLIC_APP_ENV ??
    extra.EXPO_PUBLIC_APP_ENV ??
    'development',
} as const;
